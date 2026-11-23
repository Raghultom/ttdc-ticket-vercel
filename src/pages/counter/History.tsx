import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTicketPrinter } from '../../components/print/useTicketPrinter';
import KpiCard from '../../components/common/KpiCard';
import { PAYMENT_MODE_LABEL_KEYS } from '../../constants/paymentModes';
import { TICKET_STATUS_LABEL_KEYS } from '../../constants/ticketStatus';
import * as ticketsApi from '../../services/api/tickets';
import { useAuthStore } from '../../store/authStore';
import { usePrinterSettingsStore } from '../../store/printerSettingsStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Ticket } from '../../types/models';
import { formatCurrency, formatDateTime, maskMobile, todayISODate } from '../../utils/format';

export default function History() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const activeCounterId = useAuthStore((s) => s.activeCounterId);
  const events = useSettingsStore((s) => s.events);
  const generalSettings = useSettingsStore((s) => s.generalSettings);
  const paperSize = usePrinterSettingsStore((s) => s.paperSize);

  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [todayTickets, setTodayTickets] = useState<Ticket[]>([]);
  const [reprintTarget, setReprintTarget] = useState<Ticket | null>(null);
  const [reprintReason, setReprintReason] = useState('');
  const navigate = useNavigate();

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

  const loadTickets = useCallback(async () => {
    if (!activeCounterId) return;
    const [all, today] = await Promise.all([
      ticketsApi.list({ counterId: activeCounterId, search: search || undefined }),
      ticketsApi.list({ counterId: activeCounterId, dateFrom: todayISODate(), dateTo: todayISODate(), status: 'PAID' }),
    ]);
    setTickets(all);
    setTodayTickets(today);
  }, [activeCounterId, search]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const todaySummary = useMemo(() => {
    const cash = todayTickets.filter((t) => t.paymentMode === 'CASH').reduce((s, t) => s + t.totalAmount, 0);
    const upi = todayTickets.filter((t) => t.paymentMode !== 'CASH').reduce((s, t) => s + t.totalAmount, 0);
    return {
      count: todayTickets.length,
      adults: todayTickets.reduce((s, t) => s + t.adults, 0),
      children: todayTickets.reduce((s, t) => s + t.children, 0),
      cash,
      upi,
      total: cash + upi,
    };
  }, [todayTickets]);

  const openReprint = (ticket: Ticket) => {
    setReprintTarget(ticket);
    setReprintReason('');
  };

  const confirmReprint = async () => {
    if (!reprintTarget || !user) return;
    const updated = await ticketsApi.reprint(reprintTarget.id, { id: user.id, name: user.name }, reprintReason || 'Reprint requested');
    print(updated, true);
    setReprintTarget(null);
    await loadTickets();
  };

  if (!user) return null;

  return (
    <Stack spacing={2}>
      {portal}
      <Typography variant="h5">{t('history.title')}</Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label={t('history.todaysTickets')} value={String(todaySummary.count)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label={t('history.adultsChildren')} value={`${todaySummary.adults} / ${todaySummary.children}`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label={t('history.cash')} value={formatCurrency(todaySummary.cash)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label={t('history.upi')} value={formatCurrency(todaySummary.upi)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <KpiCard label={t('history.total')} value={formatCurrency(todaySummary.total)} />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <TextField
          label={t('history.searchPlaceholder')}
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('history.ticketNo')}</TableCell>
              <TableCell>{t('history.dateTime')}</TableCell>
              <TableCell>{t('history.visitor')}</TableCell>
              <TableCell align="right">{t('history.persons')}</TableCell>
              <TableCell align="right">{t('history.totalRs')}</TableCell>
              <TableCell>{t('history.mode')}</TableCell>
              <TableCell>{t('history.status')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id} hover>
                <TableCell>{ticket.ticketNo}</TableCell>
                <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
                <TableCell>
                  {ticket.visitorName || '-'} {ticket.visitorMobile ? `(${maskMobile(ticket.visitorMobile)})` : ''}
                </TableCell>
                <TableCell align="right">{ticket.totalPersons}</TableCell>
                <TableCell align="right">{formatCurrency(ticket.totalAmount)}</TableCell>
                <TableCell>{t(PAYMENT_MODE_LABEL_KEYS[ticket.paymentMode])}</TableCell>
                <TableCell>{t(TICKET_STATUS_LABEL_KEYS[ticket.status])}</TableCell>
                <TableCell align="right">
                  <Tooltip title={t('history.view')}>
                    <IconButton size="small" onClick={() => navigate(`/counter/history/${ticket.id}`)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {ticket.status === 'PAID' && (
                    <Tooltip title={t('history.reprintTooltip')}>
                      <IconButton size="small" onClick={() => openReprint(ticket)}>
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {t('history.noTicketsFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!reprintTarget} onClose={() => setReprintTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {t('history.reprintTicket')} — {reprintTarget?.ticketNo}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('history.reprintNotice')}
          </Alert>
          <TextField
            label={t('common.reasonOptional')}
            fullWidth
            value={reprintReason}
            onChange={(e) => setReprintReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReprintTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={confirmReprint}>
            {t('history.reprintButton')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
