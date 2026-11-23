import { MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateRangeFilter, { type DateRangeValue } from '../../../components/common/DateRangeFilter';
import ExportButton from '../../../components/common/ExportButton';
import * as reportsApi from '../../../services/api/reports';
import type { GstReportRow } from '../../../services/api/reports';
import { useAuthStore } from '../../../store/authStore';
import { useSettingsStore } from '../../../store/settingsStore';
import type { TicketFilters } from '../../../types/models';
import { formatCurrency, formatDate, todayISODate } from '../../../utils/format';
import { scopedEventIdsFilter, visibleEvents } from '../../../utils/scope';

export default function GstReport() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const allEvents = useSettingsStore((s) => s.events);
  const refreshEvents = useSettingsStore((s) => s.refreshEvents);

  const [dateRange, setDateRange] = useState<DateRangeValue>({
    dateFrom: todayISODate(),
    dateTo: todayISODate(),
  });
  const [eventId, setEventId] = useState('');
  const [rows, setRows] = useState<GstReportRow[]>([]);

  const events = currentUser ? visibleEvents(currentUser, allEvents) : [];
  const filters: TicketFilters = {
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    eventId: eventId || undefined,
    eventIds: currentUser ? scopedEventIdsFilter(currentUser, allEvents, eventId) : undefined,
  };
  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setRows(await reportsApi.gstReport(filters));
  }, [filtersKey]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = rows.reduce(
    (acc, r) => ({
      taxableValue: acc.taxableValue + r.taxableValue,
      cgst: acc.cgst + r.cgst,
      sgst: acc.sgst + r.sgst,
      igst: acc.igst + r.igst,
      total: acc.total + r.total,
    }),
    { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );

  const exportRows = rows.map((r) => ({
    Date: formatDate(r.date),
    'Taxable Value ₹': r.taxableValue / 100,
    'CGST ₹': r.cgst / 100,
    'SGST ₹': r.sgst / 100,
    'IGST ₹': r.igst / 100,
    'Total ₹': r.total / 100,
  }));

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t('reports.gstTitle')}</Typography>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }} spacing={2}>
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
          <ExportButton rows={exportRows} filename="ttdc-gst-report" />
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('reports.date')}</TableCell>
              <TableCell align="right">{t('reports.taxableValueRs')}</TableCell>
              <TableCell align="right">{t('reports.cgstRs')}</TableCell>
              <TableCell align="right">{t('reports.sgstRs')}</TableCell>
              <TableCell align="right">{t('reports.igstRs')}</TableCell>
              <TableCell align="right">{t('reports.totalRs')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.date} hover>
                <TableCell>{formatDate(r.date)}</TableCell>
                <TableCell align="right">{formatCurrency(r.taxableValue)}</TableCell>
                <TableCell align="right">{formatCurrency(r.cgst)}</TableCell>
                <TableCell align="right">{formatCurrency(r.sgst)}</TableCell>
                <TableCell align="right">{formatCurrency(r.igst)}</TableCell>
                <TableCell align="right">{formatCurrency(r.total)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {t('common.noDataForFilter')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableBody>
              <TableRow>
                <TableCell>
                  <strong>{t('common.total')}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totals.taxableValue)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totals.cgst)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totals.sgst)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totals.igst)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{formatCurrency(totals.total)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </Paper>
    </Stack>
  );
}
