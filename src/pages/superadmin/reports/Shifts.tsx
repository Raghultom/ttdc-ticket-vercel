import { MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateRangeFilter, { type DateRangeValue } from '../../../components/common/DateRangeFilter';
import ExportButton from '../../../components/common/ExportButton';
import * as shiftsApi from '../../../services/api/shifts';
import { useAuthStore } from '../../../store/authStore';
import { useSettingsStore } from '../../../store/settingsStore';
import type { ShiftClose } from '../../../types/models';
import { formatCurrency, formatDateTime, todayISODate } from '../../../utils/format';
import { visibleEvents } from '../../../utils/scope';

export default function ShiftsReport() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const counters = useSettingsStore((s) => s.counters);
  const allEvents = useSettingsStore((s) => s.events);
  const refreshCounters = useSettingsStore((s) => s.refreshCounters);
  const refreshEvents = useSettingsStore((s) => s.refreshEvents);

  const events = currentUser ? visibleEvents(currentUser, allEvents) : [];

  const [dateRange, setDateRange] = useState<DateRangeValue>({ dateFrom: todayISODate(), dateTo: todayISODate() });
  const [eventId, setEventId] = useState('');
  const [counterId, setCounterId] = useState('');
  const [allRows, setAllRows] = useState<ShiftClose[]>([]);

  const filters = { dateFrom: dateRange.dateFrom, dateTo: dateRange.dateTo, counterId: counterId || undefined };
  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setAllRows(await shiftsApi.list(filters));
  }, [filtersKey]);

  useEffect(() => {
    refreshCounters();
    refreshEvents();
  }, [refreshCounters, refreshEvents]);

  useEffect(() => {
    load();
  }, [load]);

  const scopedEventIds = eventId ? [eventId] : events.map((e) => e.id);
  const eventCounterIds = new Set(counters.filter((c) => scopedEventIds.includes(c.eventId)).map((c) => c.id));
  const rows = allRows.filter((r) => eventCounterIds.has(r.counterId));

  const exportRows = rows.map((r) => ({
    Date: r.date,
    Counter: r.counterCode,
    Operator: r.userName,
    Tickets: r.ticketCount,
    Persons: r.persons,
    'System Cash ₹': r.systemCash / 100,
    'System UPI ₹': r.systemUpi / 100,
    'Declared Cash ₹': r.declaredCash / 100,
    'Difference ₹': r.difference / 100,
    'Closed At': formatDateTime(r.closedAt),
  }));

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t('reports.shiftsTitle')}</Typography>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }} spacing={2}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
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
              {counters.filter((c) => (eventId ? c.eventId === eventId : events.some((e) => e.id === c.eventId))).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.code}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <ExportButton rows={exportRows} filename="ttdc-shift-close" />
        </Stack>
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('reports.date')}</TableCell>
              <TableCell>{t('common.counter')}</TableCell>
              <TableCell>{t('reports.operator')}</TableCell>
              <TableCell align="right">{t('dashboard.tickets')}</TableCell>
              <TableCell align="right">{t('shiftClose.persons')}</TableCell>
              <TableCell align="right">{t('reports.systemCashRs')}</TableCell>
              <TableCell align="right">{t('reports.systemUpiRs')}</TableCell>
              <TableCell align="right">{t('reports.declaredCashRs')}</TableCell>
              <TableCell align="right">{t('reports.differenceRs')}</TableCell>
              <TableCell>{t('reports.closedAt')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.counterCode}</TableCell>
                <TableCell>{r.userName}</TableCell>
                <TableCell align="right">{r.ticketCount}</TableCell>
                <TableCell align="right">{r.persons}</TableCell>
                <TableCell align="right">{formatCurrency(r.systemCash)}</TableCell>
                <TableCell align="right">{formatCurrency(r.systemUpi)}</TableCell>
                <TableCell align="right">{formatCurrency(r.declaredCash)}</TableCell>
                <TableCell align="right" sx={{ color: r.difference < 0 ? 'error.main' : r.difference > 0 ? 'info.main' : 'inherit' }}>
                  {formatCurrency(r.difference)}
                </TableCell>
                <TableCell>{formatDateTime(r.closedAt)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  {t('reports.noShiftRecords')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
