import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import * as eventsApi from '../../services/api/events';
import CreateEventWizard from '../../components/events/CreateEventWizard';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Event, EventStatus } from '../../types/models';
import { basePathForRole, visibleEvents } from '../../utils/scope';
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABEL_KEYS, getEventStatus } from '../../utils/eventStatus';
import { formatDate } from '../../utils/format';
import { eventSchema, type EventFormValues } from '../../utils/validators';

const emptyDefaults: EventFormValues = {
  name: '',
  venue: '',
  city: '',
  dateFrom: '',
  dateTo: '',
  timingsStart: '10:00',
  timingsEnd: '20:00',
};

type TabValue = 'ALL' | EventStatus;

export default function Events() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const allEvents = useSettingsStore((s) => s.events);
  const counters = useSettingsStore((s) => s.counters);
  const refreshEvents = useSettingsStore((s) => s.refreshEvents);
  const refreshCounters = useSettingsStore((s) => s.refreshCounters);
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabValue>('ALL');
  const [editOpen, setEditOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({ resolver: zodResolver(eventSchema), defaultValues: emptyDefaults });

  useEffect(() => {
    refreshEvents();
    refreshCounters();
  }, [refreshEvents, refreshCounters]);

  const events = useMemo(() => (user ? visibleEvents(user, allEvents) : []), [user, allEvents]);

  const editingStatus = editing ? getEventStatus(editing) : null;

  const rows = useMemo(() => {
    const withStatus = events.map((e) => ({ event: e, status: getEventStatus(e) }));
    if (tab === 'ALL') return withStatus;
    return withStatus.filter((r) => r.status === tab);
  }, [events, tab]);

  if (!user) return null;
  const base = basePathForRole(user);

  const openCreate = () => {
    setWizardOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditing(event);
    reset(event);
    setError(null);
    setEditOpen(true);
  };

  const onSubmit = async (values: EventFormValues) => {
    if (!editing) return;
    setError(null);
    try {
      await eventsApi.update(editing.id, values);
      await refreshEvents();
      setEditOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const counterCount = (eventId: string) => counters.filter((c) => c.eventId === eventId).length;

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">{t('events.title')}</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
          {t('events.createEvent')}
        </Button>
      </Stack>

      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={t('events.all')} value="ALL" />
          <Tab label={t('events.upcoming')} value="UPCOMING" />
          <Tab label={t('events.ongoing')} value="ONGOING" />
          <Tab label={t('events.over')} value="OVER" />
        </Tabs>
      </Paper>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('events.name')}</TableCell>
              <TableCell>{t('common.city')}</TableCell>
              <TableCell>{t('common.venue')}</TableCell>
              <TableCell>{t('events.dates')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell align="right">{t('events.counters')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ event, status }) => (
              <TableRow key={event.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`${base}/events/${event.id}`)}>
                <TableCell>{event.name}</TableCell>
                <TableCell>{event.city || '-'}</TableCell>
                <TableCell>{event.venue || '-'}</TableCell>
                <TableCell>
                  {formatDate(event.dateFrom)} – {formatDate(event.dateTo)}
                </TableCell>
                <TableCell>
                  <Chip size="small" label={t(EVENT_STATUS_LABEL_KEYS[status])} color={EVENT_STATUS_COLORS[status]} />
                </TableCell>
                <TableCell align="right">{counterCount(event.id)}</TableCell>
                <TableCell align="right">
                  {status !== 'OVER' && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(event);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {t('events.noEventsInCategory')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('events.editEvent')}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {editingStatus === 'ONGOING' && <Alert severity="info">{t('events.ongoingEditNotice')}</Alert>}
              <TextField
                label={t('events.eventName')}
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message && t(errors.name.message)}
                {...register('name')}
              />
              <Stack direction="row" spacing={2}>
                <TextField label={t('common.venue')} fullWidth {...register('venue')} />
                <TextField
                  label={t('common.city')}
                  fullWidth
                  error={!!errors.city}
                  helperText={errors.city?.message && t(errors.city.message)}
                  {...register('city')}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('events.startDate')}
                  type="date"
                  fullWidth
                  disabled={editingStatus === 'ONGOING' || editingStatus === 'OVER'}
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.dateFrom}
                  helperText={errors.dateFrom?.message && t(errors.dateFrom.message)}
                  {...register('dateFrom')}
                />
                <TextField
                  label={t('events.endDate')}
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.dateTo}
                  helperText={errors.dateTo?.message && t(errors.dateTo.message)}
                  {...register('dateTo')}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('events.timingsStart')}
                  type="time"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('timingsStart')}
                />
                <TextField
                  label={t('events.timingsEnd')}
                  type="time"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('timingsEnd')}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <CreateEventWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={(event) => {
          setWizardOpen(false);
          navigate(`${base}/events/${event.id}`);
        }}
      />
    </Stack>
  );
}
