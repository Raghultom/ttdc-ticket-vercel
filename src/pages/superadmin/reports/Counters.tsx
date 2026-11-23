import { MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateRangeFilter, { type DateRangeValue } from '../../../components/common/DateRangeFilter';
import ExportButton from '../../../components/common/ExportButton';
import * as reportsApi from '../../../services/api/reports';
import type { GroupSummaryRow } from '../../../services/api/reports';
import { useAuthStore } from '../../../store/authStore';
import { useSettingsStore } from '../../../store/settingsStore';
import type { TicketFilters } from '../../../types/models';
import { formatCurrency, todayISODate } from '../../../utils/format';
import { scopedEventIdsFilter, visibleEvents } from '../../../utils/scope';

function toExportRows(rows: GroupSummaryRow[]) {
  return rows.map((r) => ({
    Label: r.label,
    'Sub Label': r.subLabel,
    Tickets: r.tickets,
    Adults: r.adults,
    Children: r.children,
    'Cash ₹': r.cash / 100,
    'UPI ₹': r.upi / 100,
    'Total ₹': r.total / 100,
    'GST ₹': r.gst / 100,
  }));
}

function SummaryTable({
  title,
  filename,
  firstColumn,
  rows,
}: {
  title: string;
  filename: string;
  firstColumn: string;
  rows: GroupSummaryRow[];
}) {
  const { t } = useTranslation();
  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1">{title}</Typography>
        <ExportButton rows={toExportRows(rows)} filename={filename} />
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{firstColumn}</TableCell>
            <TableCell align="right">{t('dashboard.tickets')}</TableCell>
            <TableCell align="right">{t('dashboard.adults')}</TableCell>
            <TableCell align="right">{t('dashboard.children')}</TableCell>
            <TableCell align="right">{t('dashboard.cashRs')}</TableCell>
            <TableCell align="right">{t('dashboard.upiRs')}</TableCell>
            <TableCell align="right">{t('dashboard.totalRs')}</TableCell>
            <TableCell align="right">{t('dashboard.gstRs')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key} hover>
              <TableCell>
                {r.subLabel} — {r.label}
              </TableCell>
              <TableCell align="right">{r.tickets}</TableCell>
              <TableCell align="right">{r.adults}</TableCell>
              <TableCell align="right">{r.children}</TableCell>
              <TableCell align="right">{formatCurrency(r.cash)}</TableCell>
              <TableCell align="right">{formatCurrency(r.upi)}</TableCell>
              <TableCell align="right">{formatCurrency(r.total)}</TableCell>
              <TableCell align="right">{formatCurrency(r.gst)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">
                {t('common.noDataForFilter')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}

export default function CountersReport() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const allEvents = useSettingsStore((s) => s.events);
  const refreshEvents = useSettingsStore((s) => s.refreshEvents);

  const [dateRange, setDateRange] = useState<DateRangeValue>({ dateFrom: todayISODate(), dateTo: todayISODate() });
  const [eventId, setEventId] = useState('');
  const [eventRows, setEventRows] = useState<GroupSummaryRow[]>([]);
  const [counterRows, setCounterRows] = useState<GroupSummaryRow[]>([]);
  const [userRows, setUserRows] = useState<GroupSummaryRow[]>([]);

  const events = currentUser ? visibleEvents(currentUser, allEvents) : [];
  const filters: TicketFilters = {
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    eventId: eventId || undefined,
    eventIds: currentUser ? scopedEventIdsFilter(currentUser, allEvents, eventId) : undefined,
  };
  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    const [ev, c, u] = await Promise.all([
      reportsApi.eventSummary(filters),
      reportsApi.counterSummary(filters),
      reportsApi.userSummary(filters),
    ]);
    setEventRows(ev);
    setCounterRows(c);
    setUserRows(u);
  }, [filtersKey]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t('reports.countersTitle')}</Typography>
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <TextField select size="small" label={t('common.event')} value={eventId} onChange={(e) => setEventId(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="">{t('common.allEvents')}</MenuItem>
            {events.map((ev) => (
              <MenuItem key={ev.id} value={ev.id}>
                {ev.name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>
      <SummaryTable
        title={t('reports.eventWiseSummary')}
        filename="event-wise-summary"
        firstColumn={t('common.event')}
        rows={eventRows}
      />
      <SummaryTable
        title={t('reports.counterWiseSummary')}
        filename="counter-wise-summary"
        firstColumn={t('common.counter')}
        rows={counterRows}
      />
      <SummaryTable
        title={t('reports.subAdminWiseSummary')}
        filename="sub-admin-wise-summary"
        firstColumn={t('common.subAdmin')}
        rows={userRows}
      />
    </Stack>
  );
}
