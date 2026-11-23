import PrintIcon from '@mui/icons-material/Print';
import { Alert, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import ShiftReportPrint from '../../components/print/ShiftReportPrint';
import * as shiftsApi from '../../services/api/shifts';
import type { ShiftTotals } from '../../services/api/shifts';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { ShiftClose as ShiftCloseModel } from '../../types/models';
import { formatCurrency, rupeesToPaise } from '../../utils/format';

export default function ShiftClose() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const activeCounterId = useAuthStore((s) => s.activeCounterId);
  const counters = useSettingsStore((s) => s.counters);
  const events = useSettingsStore((s) => s.events);
  const counter = counters.find((c) => c.id === activeCounterId);
  const event = events.find((e) => e.id === counter?.eventId);

  const [totals, setTotals] = useState<ShiftTotals | null>(null);
  const [declaredCash, setDeclaredCash] = useState('');
  const [closedShift, setClosedShift] = useState<ShiftCloseModel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const printFn = useReactToPrint({ contentRef: printRef, documentTitle: 'shift-close' });

  const loadTotals = useCallback(async () => {
    if (!user || !activeCounterId) return;
    setTotals(await shiftsApi.getShiftTotals(user.id, activeCounterId));
  }, [user, activeCounterId]);

  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  if (!user || !counter) return null;
  if (!totals) {
    return (
      <Stack sx={{ alignItems: 'center', mt: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  const declaredPaise = declaredCash ? rupeesToPaise(Number(declaredCash)) : null;
  const difference = declaredPaise !== null ? declaredPaise - totals.systemCash : null;

  const handleClose = async () => {
    if (declaredPaise === null) return;
    setSubmitting(true);
    try {
      const shift = await shiftsApi.closeShift({
        userId: user.id,
        userName: user.name,
        counterId: counter.id,
        counterCode: counter.code,
        declaredCash: declaredPaise,
      });
      setClosedShift(shift);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      <Typography variant="h5">{t('shiftClose.title')}</Typography>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1">{t('shiftClose.todaysSystemTotals')}</Typography>
          <Row label={t('shiftClose.ticketsIssued')} value={String(totals.ticketCount)} />
          <Row label={t('shiftClose.persons')} value={String(totals.persons)} />
          <Row label={t('shiftClose.systemCash')} value={formatCurrency(totals.systemCash)} />
          <Row label={t('shiftClose.systemUpi')} value={formatCurrency(totals.systemUpi)} />
        </Stack>
      </Paper>

      {!closedShift ? (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <TextField
              label={t('shiftClose.actualCashInHand')}
              type="number"
              value={declaredCash}
              onChange={(e) => setDeclaredCash(e.target.value)}
              fullWidth
            />
            {difference !== null && (
              <Alert severity={difference === 0 ? 'success' : difference > 0 ? 'info' : 'warning'}>
                {difference === 0
                  ? t('shiftClose.cashMatches')
                  : difference > 0
                    ? t('shiftClose.excessOf', { amount: formatCurrency(difference) })
                    : t('shiftClose.shortBy', { amount: formatCurrency(Math.abs(difference)) })}
              </Alert>
            )}
            <Button variant="contained" size="large" disabled={declaredPaise === null || submitting} onClick={handleClose}>
              {t('shiftClose.closeShift')}
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('shiftClose.closedSuccess')}
          </Alert>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => printFn()}>
            {t('shiftClose.printSummary')}
          </Button>
          <div style={{ display: 'none' }}>
            <div ref={printRef}>
              <ShiftReportPrint shift={closedShift} fairName={event?.name ?? 'TTDC Fair'} />
            </div>
          </div>
        </Paper>
      )}
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
    </Stack>
  );
}
