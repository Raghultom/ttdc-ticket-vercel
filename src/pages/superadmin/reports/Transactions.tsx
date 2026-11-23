import CancelIcon from '@mui/icons-material/Cancel';
import PrintIcon from '@mui/icons-material/Print';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
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
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateRangeFilter, { type DateRangeValue } from '../../../components/common/DateRangeFilter';
import ExportButton from '../../../components/common/ExportButton';
import { useTicketPrinter } from '../../../components/print/useTicketPrinter';
import * as reportsApi from '../../../services/api/reports';
import * as ticketsApi from '../../../services/api/tickets';
import { useAuthStore } from '../../../store/authStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { PAYMENT_MODE_LABEL_KEYS } from '../../../constants/paymentModes';
import { TICKET_STATUS_LABEL_KEYS, type TicketStatus } from '../../../constants/ticketStatus';
import type { Ticket, TicketFilters } from '../../../types/models';
import { formatCurrency, formatDateTime, maskMobile, todayISODate } from '../../../utils/format';
import { scopedEventIdsFilter, visibleEvents } from '../../../utils/scope';

export default function TransactionsReport() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const counters = useSettingsStore((s) => s.counters);
  const allEvents = useSettingsStore((s) => s.events);
  const events = user ? visibleEvents(user, allEvents) : [];
  const generalSettings = useSettingsStore((s) => s.generalSettings);
  const refreshCounters = useSettingsStore((s) => s.refreshCounters);
  const refreshEvents = useSettingsStore((s) => s.refreshEvents);

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    dateFrom: todayISODate(),
    dateTo: todayISODate(),
  });
  const [eventId, setEventId] = useState('');
  const [counterId, setCounterId] = useState('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [exportRows, setExportRows] = useState<reportsApi.TransactionExportRow[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Ticket | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const { print, portal } = useTicketPrinter(
    events,
    generalSettings ?? {
      logoUrl: '',
      footerText: '',
      ticketValiditySameDayOnly: true,
      defaultPrinterSize: '80mm',
    },
    '80mm',
  );

  const filters: TicketFilters = {
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    eventId: eventId || undefined,
    eventIds: user ? scopedEventIdsFilter(user, allEvents, eventId) : undefined,
    counterId: counterId || undefined,
    status: status || undefined,
    search: search || undefined,
  };
  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    const [list, rows] = await Promise.all([ticketsApi.list(filters), reportsApi.exportTransactions(filters)]);
    setTickets(list);
    setExportRows(rows);
  }, [filtersKey]);

  useEffect(() => {
    refreshCounters();
    refreshEvents();
  }, [refreshCounters, refreshEvents]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReprint = async (ticket: Ticket) => {
    if (!user) return;
    const updated = await ticketsApi.reprint(ticket.id, { id: user.id, name: user.name }, 'SA reprint');
    print(updated, true);
    await load();
  };

  const confirmCancel = async () => {
    if (!cancelTarget || !user || !cancelReason.trim()) return;
    await ticketsApi.cancel(cancelTarget.id, { id: user.id, name: user.name }, cancelReason);
    setCancelTarget(null);
    setCancelReason('');
    await load();
  };

  return (
    <Stack spacing={2}>
      {portal}
      <Typography variant="h5">{t('reports.transactionsTitle')}</Typography>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2} direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <TextField
              select
              size="small"
              label={t('common.event')}
              value={eventId}
              onChange={(e) => {
                setEventId(e.target.value);
                setCounterId('');
              }}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">{t('common.allEvents')}</MenuItem>
              {events.map((ev) => (
                <MenuItem key={ev.id} value={ev.id}>
                  {ev.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={t('common.counter')}
              value={counterId}
              onChange={(e) => setCounterId(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">{t('common.allCounters')}</MenuItem>
              {counters.filter((c) => (eventId ? c.eventId === eventId : events.some((ev) => ev.id === c.eventId))).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={t('common.status')}
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus | '')}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">{t('common.all')}</MenuItem>
              <MenuItem value="PENDING">{t('reports.pending')}</MenuItem>
              <MenuItem value="PAID">{t('reports.paid')}</MenuItem>
              <MenuItem value="FAILED">{t('reports.failed')}</MenuItem>
              <MenuItem value="CANCELLED">{t('reports.cancelled')}</MenuItem>
            </TextField>
            <TextField size="small" label={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </Stack>
          <ExportButton rows={exportRows} filename="ttdc-transactions" />
        </Stack>
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('history.ticketNo')}</TableCell>
              <TableCell>{t('history.dateTime')}</TableCell>
              <TableCell>{t('common.counter')}</TableCell>
              <TableCell>{t('dashboard.issuedBy')}</TableCell>
              <TableCell>{t('history.visitor')}</TableCell>
              <TableCell align="right">{t('history.persons')}</TableCell>
              <TableCell align="right">{t('history.totalRs')}</TableCell>
              <TableCell>{t('history.mode')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id} hover>
                <TableCell>{ticket.ticketNo}</TableCell>
                <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
                <TableCell>{ticket.counterCode}</TableCell>
                <TableCell>{ticket.issuedByName}</TableCell>
                <TableCell>
                  {ticket.visitorName || '-'} {ticket.visitorMobile ? `(${maskMobile(ticket.visitorMobile)})` : ''}
                </TableCell>
                <TableCell align="right">{ticket.totalPersons}</TableCell>
                <TableCell align="right">{formatCurrency(ticket.totalAmount)}</TableCell>
                <TableCell>{t(PAYMENT_MODE_LABEL_KEYS[ticket.paymentMode])}</TableCell>
                <TableCell>{t(TICKET_STATUS_LABEL_KEYS[ticket.status])}</TableCell>
                <TableCell align="right">
                  {ticket.status === 'PAID' && (
                    <>
                      <Tooltip title={t('history.reprintTooltip')}>
                        <IconButton size="small" onClick={() => handleReprint(ticket)}>
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.cancel')}>
                        <IconButton size="small" onClick={() => setCancelTarget(ticket)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  {t('reports.noTransactionsForFilter')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {t('reports.cancelTicket')} — {cancelTarget?.ticketNo}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('reports.cancelNotice')}
          </Alert>
          <TextField
            label={t('reports.cancellationReason')}
            fullWidth
            required
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelTarget(null)}>{t('common.back')}</Button>
          <Button variant="contained" color="error" onClick={confirmCancel} disabled={!cancelReason.trim()}>
            {t('reports.cancelTicket')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
