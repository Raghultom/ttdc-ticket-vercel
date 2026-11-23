import PrintIcon from '@mui/icons-material/Print';
import ReplayIcon from '@mui/icons-material/Replay';
import { Alert, Button, Grid, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CashChangeCalc from '../../components/ticket/CashChangeCalc';
import PaymentModeSelector from '../../components/ticket/PaymentModeSelector';
import PriceSummary from '../../components/ticket/PriceSummary';
import QuantitySelector from '../../components/ticket/QuantitySelector';
import { useTicketPrinter } from '../../components/print/useTicketPrinter';
import type { PaymentMode } from '../../constants/paymentModes';
import { payWithRazorpay } from '../../services/payment/razorpay';
import * as ticketsApi from '../../services/api/tickets';
import { useAuthStore } from '../../store/authStore';
import { usePrinterSettingsStore } from '../../store/printerSettingsStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Ticket } from '../../types/models';
import { calculateBilling } from '../../utils/billing';
import { rupeesToPaise } from '../../utils/format';
import { MOBILE_REGEX } from '../../utils/validators';

const MAX_PERSONS = 50;

export default function IssueTicket() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const activeCounterId = useAuthStore((s) => s.activeCounterId);
  const categories = useSettingsStore((s) => s.categories);
  const counters = useSettingsStore((s) => s.counters);
  const events = useSettingsStore((s) => s.events);
  const taxSettings = useSettingsStore((s) => s.taxSettings);
  const generalSettings = useSettingsStore((s) => s.generalSettings);
  const paperSize = usePrinterSettingsStore((s) => s.paperSize);

  const counter = useMemo(() => counters.find((c) => c.id === activeCounterId), [counters, activeCounterId]);
  const activeCategories = useMemo(
    () =>
      categories
        .filter((c) => c.active && c.eventId === counter?.eventId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [categories, counter],
  );

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [visitorName, setVisitorName] = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const resetRef = useRef<() => void>(() => {});
  const confirmRef = useRef<() => void>(() => {});

  // F2 = new/reset ticket, F9 = select Cash (press again to confirm), F10 = select UPI.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        resetRef.current();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (paymentMode !== 'CASH') {
          setPaymentMode('CASH');
        } else {
          confirmRef.current();
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        setPaymentMode('UPI');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paymentMode]);

  const { print, portal } = useTicketPrinter(
    events,
    generalSettings ?? {
      logoUrl: '',
      footerText: '',
      ticketValiditySameDayOnly: true,
      defaultPrinterSize: paperSize,
    },
    paperSize,
  );

  const lines = useMemo(
    () =>
      activeCategories
        .filter((c) => (quantities[c.id] ?? 0) > 0)
        .map((c) => ({ categoryId: c.id, name: c.name, qty: quantities[c.id] ?? 0, unitPrice: c.isFree ? 0 : c.price })),
    [activeCategories, quantities],
  );

  const billing = useMemo(() => {
    if (!taxSettings) return null;
    return calculateBilling(lines, taxSettings);
  }, [lines, taxSettings]);

  if (!user || !counter || !taxSettings || !generalSettings) return null;

  const adults = activeCategories
    .filter((c) => c.code === 'ADT')
    .reduce((sum, c) => sum + (quantities[c.id] ?? 0), 0);
  const children = activeCategories
    .filter((c) => c.code === 'CHD')
    .reduce((sum, c) => sum + (quantities[c.id] ?? 0), 0);

  const resetForm = () => {
    setQuantities({});
    setVisitorName('');
    setVisitorMobile('');
    setPaymentMode(null);
    setCashReceived('');
    setError(null);
    firstFieldRef.current?.focus();
  };
  // Keep the ref in sync every render (not inside an effect) so the window-level keydown
  // handler registered above always calls the latest closure without needing to be
  // re-registered on every state change.
  resetRef.current = resetForm;

  const validate = (): string | null => {
    if (!billing || billing.totalPersons < 1) return t('issueTicket.addPersonError');
    if (billing.totalPersons > MAX_PERSONS) return t('issueTicket.maxPersonsError', { max: MAX_PERSONS });
    if (visitorMobile && !MOBILE_REGEX.test(visitorMobile)) return t('issueTicket.invalidMobileError');
    if (!paymentMode) return t('issueTicket.selectPaymentModeError');
    return null;
  };

  const buildAndSaveTicket = async (payment: Ticket['payment'], mode: PaymentMode) => {
    if (!billing) return;
    const ticket = await ticketsApi.create({
      ticketPrefix: counter.ticketPrefix,
      eventId: counter.eventId,
      counterId: counter.id,
      counterCode: counter.code,
      issuedBy: user.id,
      issuedByName: user.name,
      visitorName,
      visitorMobile,
      items: billing.items,
      totalPersons: billing.totalPersons,
      adults,
      children,
      taxSnapshot: { gstRate: taxSettings.gstRate, pricingMode: taxSettings.pricingMode, splitType: taxSettings.splitType },
      taxableValue: billing.taxableValue,
      cgst: billing.cgst,
      sgst: billing.sgst,
      igst: billing.igst,
      roundOff: billing.roundOff,
      totalAmount: billing.finalTotal,
      paymentMode: mode,
      payment,
      status: 'PAID',
    });

    setLastTicket(ticket);
    print(ticket);
    resetForm();
  };

  const handleConfirm = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!billing) return;
    setError(null);
    setSubmitting(true);
    try {
      if (paymentMode === 'CASH') {
        const receivedPaise = cashReceived ? rupeesToPaise(Number(cashReceived)) : billing.finalTotal;
        if (receivedPaise < billing.finalTotal) {
          setError(t('issueTicket.insufficientCashError'));
          return;
        }
        await buildAndSaveTicket(
          {
            razorpayPaymentId: null,
            razorpayOrderId: null,
            cashReceived: receivedPaise,
            changeReturned: receivedPaise - billing.finalTotal,
            upiManualRef: null,
          },
          'CASH',
        );
      } else if (paymentMode === 'UPI') {
        const result = await payWithRazorpay({
          amountPaise: billing.finalTotal,
          visitorName,
          visitorMobile,
          counterCode: counter.code,
          operatorName: user.name,
          personsLabel: `${billing.totalPersons} persons`,
        });
        await buildAndSaveTicket(
          {
            razorpayPaymentId: result.razorpayPaymentId,
            razorpayOrderId: null,
            cashReceived: null,
            changeReturned: null,
            upiManualRef: null,
          },
          'UPI',
        );
      }
    } catch (err) {
      setError(t(err instanceof Error ? err.message : 'issueTicket.transactionFailedError'));
    } finally {
      setSubmitting(false);
    }
  };
  confirmRef.current = handleConfirm;

  const handleReprintLast = async () => {
    if (!lastTicket) return;
    const updated = await ticketsApi.reprint(lastTicket.id, { id: user.id, name: user.name }, 'Reprint from Issue Ticket screen');
    print(updated, true);
  };

  return (
    <Stack spacing={2}>
      {portal}
      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('issueTicket.visitorDetails')}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <TextField
                label={t('common.name')}
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                fullWidth
                size="small"
                inputRef={firstFieldRef}
              />
              <TextField
                label={t('common.mobile')}
                value={visitorMobile}
                onChange={(e) => setVisitorMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                fullWidth
                size="small"
              />
            </Stack>

            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('issueTicket.ticketQuantities')}
            </Typography>
            <Stack spacing={1}>
              {activeCategories.map((cat) => (
                <QuantitySelector
                  key={cat.id}
                  name={cat.name}
                  code={cat.code}
                  qty={quantities[cat.id] ?? 0}
                  unitPrice={cat.price}
                  isFree={cat.isFree}
                  max={MAX_PERSONS}
                  onChange={(qty) => setQuantities((prev) => ({ ...prev, [cat.id]: qty }))}
                />
              ))}
              {activeCategories.length === 0 && <Alert severity="warning">{t('issueTicket.noActiveCategoriesWarning')}</Alert>}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            {billing && <PriceSummary billing={billing} gstEnabled={taxSettings.gstEnabled} splitType={taxSettings.splitType} />}

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t('issueTicket.paymentMode')}
              </Typography>
              <PaymentModeSelector
                allowedModes={counter.allowedPaymentModes}
                value={paymentMode}
                onChange={setPaymentMode}
                disabled={submitting}
              />

              {paymentMode === 'CASH' && billing && (
                <Stack sx={{ mt: 2 }}>
                  <CashChangeCalc totalAmount={billing.finalTotal} cashReceived={cashReceived} onChange={setCashReceived} />
                </Stack>
              )}
            </Paper>

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" fullWidth onClick={resetForm} disabled={submitting}>
                {t('issueTicket.reset')}
              </Button>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<PrintIcon />}
                onClick={handleConfirm}
                disabled={submitting}
              >
                {t('issueTicket.confirmAndPrint')}
              </Button>
            </Stack>
            <Button
              variant="text"
              startIcon={<ReplayIcon />}
              disabled={!lastTicket}
              onClick={handleReprintLast}
            >
              {t('issueTicket.reprintLastTicket')}
              {lastTicket ? ` (${lastTicket.ticketNo})` : ''}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t('issueTicket.shortcutsHint')}
            </Typography>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
