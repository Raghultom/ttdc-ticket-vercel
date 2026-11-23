import CancelIcon from '@mui/icons-material/Cancel';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import GroupsIcon from '@mui/icons-material/Groups';
import PaidIcon from '@mui/icons-material/Paid';
import PercentIcon from '@mui/icons-material/Percent';
import {
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RevenueByCounter from '../../components/charts/RevenueByCounter';
import RevenueByHour from '../../components/charts/RevenueByHour';
import VisitorsPie from '../../components/charts/VisitorsPie';
import DateRangeFilter, { type DateRangeValue } from '../../components/common/DateRangeFilter';
import KpiCard from '../../components/common/KpiCard';
import { PAYMENT_MODE_LABEL_KEYS, type PaymentMode } from '../../constants/paymentModes';
import { TICKET_STATUS_LABEL_KEYS } from '../../constants/ticketStatus';
import * as reportsApi from '../../services/api/reports';
import type {
  CategoryBreakdownRow,
  DashboardSummary,
  GroupSummaryRow,
  HourlyRevenuePoint,
} from '../../services/api/reports';
import * as ticketsApi from '../../services/api/tickets';
import * as usersApi from '../../services/api/users';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Ticket, TicketFilters, User } from '../../types/models';
import { formatCurrency, formatDateTime, formatNumber, todayISODate } from '../../utils/format';
import { scopedEventIdsFilter, visibleCounterEmployees, visibleEvents } from '../../utils/scope';

export default function Dashboard() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const counters = useSettingsStore((s) => s.counters);
  const allEvents = useSettingsStore((s) => s.events);
  const refreshCounters = useSettingsStore((s) => s.refreshCounters);
  const refreshEvents = useSettingsStore((s) => s.refreshEvents);
  const [users, setUsers] = useState<User[]>([]);

  const [dateRange, setDateRange] = useState<DateRangeValue>({ dateFrom: todayISODate(), dateTo: todayISODate() });
  const [eventId, setEventId] = useState('');
  const [counterId, setCounterId] = useState('');
  const [userId, setUserId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode | ''>('');

  const events = currentUser ? visibleEvents(currentUser, allEvents) : [];
  const visibleCounters = eventId ? counters.filter((c) => c.eventId === eventId) : counters;

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [counterRows, setCounterRows] = useState<GroupSummaryRow[]>([]);
  const [userRows, setUserRows] = useState<GroupSummaryRow[]>([]);
  const [hourly, setHourly] = useState<HourlyRevenuePoint[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategoryBreakdownRow[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);

  const filters: TicketFilters = {
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    eventId: eventId || undefined,
    eventIds: currentUser ? scopedEventIdsFilter(currentUser, allEvents, eventId) : undefined,
    counterId: counterId || undefined,
    userId: userId || undefined,
    paymentMode: paymentMode || undefined,
  };
  const filtersKey = JSON.stringify(filters);

  const loadData = useCallback(async () => {
    const [s, cRows, uRows, h, cats, tickets] = await Promise.all([
      reportsApi.dashboardSummary(filters),
      reportsApi.counterSummary(filters),
      reportsApi.userSummary(filters),
      reportsApi.hourlyRevenue(filters),
      reportsApi.categoryBreakdown(filters),
      ticketsApi.list(filters),
    ]);
    setSummary(s);
    setCounterRows(cRows);
    setUserRows(uRows);
    setHourly(h);
    setCategoryRows(cats);
    setRecentTickets(tickets.slice(0, 20));
  }, [filtersKey]);

  useEffect(() => {
    refreshCounters();
    refreshEvents();
    usersApi.list().then(setUsers);
  }, [refreshCounters, refreshEvents]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (!summary) {
    return (
      <Stack sx={{ alignItems: 'center', mt: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h5">{t('dashboard.title')}</Typography>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2} direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
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
            sx={{ minWidth: 180 }}
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
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">{t('common.allCounters')}</MenuItem>
            {visibleCounters.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.code} — {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('common.subAdmin')}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">{t('common.allSubAdmins')}</MenuItem>
            {(currentUser ? visibleCounterEmployees(currentUser, users) : []).map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('common.paymentMode')}
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value as PaymentMode | '')}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">{t('common.allModes')}</MenuItem>
            {Object.entries(PAYMENT_MODE_LABEL_KEYS).map(([mode, labelKey]) => (
              <MenuItem key={mode} value={mode}>
                {t(labelKey)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label={t('dashboard.totalRevenue')}
            value={formatCurrency(summary.totalRevenue)}
            icon={<PaidIcon fontSize="inherit" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label={t('dashboard.cashUpi')}
            value={`${formatCurrency(summary.cashTotal)} / ${formatCurrency(summary.upiTotal)}`}
            icon={<PaidIcon fontSize="inherit" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label={t('dashboard.ticketsIssued')}
            value={formatNumber(summary.totalTickets)}
            icon={<ConfirmationNumberIcon fontSize="inherit" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label={t('dashboard.totalVisitors')}
            value={formatNumber(summary.totalVisitors)}
            subtext={t('dashboard.adultsChildren', { adults: summary.adults, children: summary.children })}
            icon={<GroupsIcon fontSize="inherit" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label={t('dashboard.gstCollected')}
            value={formatCurrency(summary.gstTotal)}
            subtext={t('dashboard.cgstSgst', {
              cgst: formatCurrency(summary.cgstTotal),
              sgst: formatCurrency(summary.sgstTotal),
            })}
            icon={<PercentIcon fontSize="inherit" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            label={t('dashboard.cancelledTickets')}
            value={formatNumber(summary.cancelledCount)}
            subtext={formatCurrency(summary.cancelledAmount)}
            icon={<CancelIcon fontSize="inherit" />}
            color="error.main"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t('dashboard.revenueByHour')}
            </Typography>
            <RevenueByHour data={hourly} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t('dashboard.revenueByCounter')}
            </Typography>
            <RevenueByCounter data={counterRows} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t('dashboard.visitorsByCategory')}
            </Typography>
            <VisitorsPie data={categoryRows} />
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t('dashboard.counterWiseSummary')}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.counter')}</TableCell>
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
            {counterRows.map((r) => (
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
            {counterRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {t('common.noDataForFilter')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t('dashboard.subAdminWiseSummary')}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('common.subAdmin')}</TableCell>
              <TableCell>{t('common.counter')}</TableCell>
              <TableCell align="right">{t('dashboard.tickets')}</TableCell>
              <TableCell align="right">{t('dashboard.adults')}</TableCell>
              <TableCell align="right">{t('dashboard.children')}</TableCell>
              <TableCell align="right">{t('dashboard.cashRs')}</TableCell>
              <TableCell align="right">{t('dashboard.upiRs')}</TableCell>
              <TableCell align="right">{t('dashboard.totalRs')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {userRows.map((r) => (
              <TableRow key={r.key} hover>
                <TableCell>{r.label}</TableCell>
                <TableCell>{r.subLabel}</TableCell>
                <TableCell align="right">{r.tickets}</TableCell>
                <TableCell align="right">{r.adults}</TableCell>
                <TableCell align="right">{r.children}</TableCell>
                <TableCell align="right">{formatCurrency(r.cash)}</TableCell>
                <TableCell align="right">{formatCurrency(r.upi)}</TableCell>
                <TableCell align="right">{formatCurrency(r.total)}</TableCell>
              </TableRow>
            ))}
            {userRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {t('common.noDataForFilter')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t('dashboard.liveRecentTransactions')}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('dashboard.ticketNo')}</TableCell>
              <TableCell>{t('dashboard.time')}</TableCell>
              <TableCell>{t('common.counter')}</TableCell>
              <TableCell>{t('dashboard.issuedBy')}</TableCell>
              <TableCell align="right">{t('dashboard.persons')}</TableCell>
              <TableCell align="right">{t('dashboard.totalRs')}</TableCell>
              <TableCell>{t('dashboard.mode')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentTickets.map((t2) => (
              <TableRow key={t2.id} hover>
                <TableCell>{t2.ticketNo}</TableCell>
                <TableCell>{formatDateTime(t2.createdAt)}</TableCell>
                <TableCell>{t2.counterCode}</TableCell>
                <TableCell>{t2.issuedByName}</TableCell>
                <TableCell align="right">{t2.totalPersons}</TableCell>
                <TableCell align="right">{formatCurrency(t2.totalAmount)}</TableCell>
                <TableCell>{t(PAYMENT_MODE_LABEL_KEYS[t2.paymentMode])}</TableCell>
                <TableCell>{t(TICKET_STATUS_LABEL_KEYS[t2.status])}</TableCell>
              </TableRow>
            ))}
            {recentTickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {t('dashboard.noTransactionsYet')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
