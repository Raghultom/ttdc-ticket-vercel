import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ROLES } from '../../constants/roles';
import * as usersApi from '../../services/api/users';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { User } from '../../types/models';
import { visibleCounterEmployees, visibleEvents } from '../../utils/scope';
import { passwordFromName, slugifyName } from '../../utils/autoFill';
import {
  assignSubAdminToEventSchema,
  createCounterEmployeeSchema,
  subAdminSchema,
  type AssignSubAdminToEventFormValues,
  type CreateCounterEmployeeFormValues,
  type SubAdminFormValues,
} from '../../utils/validators';

const emptyCreateDefaults: CreateCounterEmployeeFormValues = {
  name: '',
  username: '',
  password: '',
  mobile: '',
  email: '',
  eventId: '',
  counterId: '',
  active: true,
};

export default function CounterEmployees() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const counters = useSettingsStore((s) => s.counters);
  const allEvents = useSettingsStore((s) => s.events);
  const refreshCounters = useSettingsStore((s) => s.refreshCounters);
  const refreshEvents = useSettingsStore((s) => s.refreshEvents);

  const [users, setUsers] = useState<User[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const usernameTouchedRef = useRef(false);
  const passwordTouchedRef = useRef(false);

  const loadUsers = useCallback(async () => {
    setUsers(await usersApi.list());
  }, []);

  useEffect(() => {
    refreshCounters();
    refreshEvents();
    loadUsers();
  }, [refreshCounters, refreshEvents, loadUsers]);

  const events = useMemo(() => (currentUser ? visibleEvents(currentUser, allEvents) : []), [currentUser, allEvents]);
  const employees = useMemo(() => (currentUser ? visibleCounterEmployees(currentUser, users) : []), [currentUser, users]);
  const assignedCounterIds = useMemo(() => new Set(users.flatMap((u) => u.counterIds)), [users]);

  const createForm = useForm<CreateCounterEmployeeFormValues>({
    resolver: zodResolver(createCounterEmployeeSchema),
    defaultValues: emptyCreateDefaults,
  });
  const createEventId = createForm.watch('eventId');
  const createAvailableCounters = useMemo(
    () => counters.filter((c) => c.eventId === createEventId && !assignedCounterIds.has(c.id)),
    [counters, createEventId, assignedCounterIds],
  );

  const assignForm = useForm<AssignSubAdminToEventFormValues>({
    resolver: zodResolver(assignSubAdminToEventSchema),
    defaultValues: { eventId: '', counterId: '' },
  });
  const selectedEventId = assignForm.watch('eventId');
  const availableCounters = useMemo(
    () => counters.filter((c) => c.eventId === selectedEventId && !assignedCounterIds.has(c.id)),
    [counters, selectedEventId, assignedCounterIds],
  );

  const editForm = useForm<SubAdminFormValues>({
    resolver: zodResolver(subAdminSchema),
    defaultValues: { name: '', mobile: '', email: '', active: true },
  });

  const openCreate = () => {
    createForm.reset(emptyCreateDefaults);
    usernameTouchedRef.current = false;
    passwordTouchedRef.current = false;
    setError(null);
    setCreateOpen(true);
  };

  const submitCreate = async (values: CreateCounterEmployeeFormValues) => {
    if (!currentUser) return;
    setError(null);
    try {
      await usersApi.create({
        name: values.name,
        username: values.username,
        password: values.password,
        role: ROLES.COUNTER_EMPLOYEE,
        counterIds: values.counterId ? [values.counterId] : [],
        mobile: values.mobile ?? '',
        email: values.email ?? '',
        active: values.active,
        createdBy: currentUser.id,
      });
      await loadUsers();
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const openAssign = (user: User) => {
    assignForm.reset({ eventId: '', counterId: '' });
    setError(null);
    setAssignTarget(user);
  };

  const submitAssign = async (values: AssignSubAdminToEventFormValues) => {
    if (!assignTarget) return;
    setError(null);
    try {
      await usersApi.assignCounter(assignTarget.id, values.counterId);
      await loadUsers();
      setAssignTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const unassign = async (user: User, counterId: string) => {
    await usersApi.unassignCounter(user.id, counterId);
    await loadUsers();
  };

  const openEdit = (user: User) => {
    editForm.reset({ name: user.name, mobile: user.mobile, email: user.email, active: user.active });
    setEditTarget(user);
  };

  const submitEdit = async (values: SubAdminFormValues) => {
    if (!editTarget) return;
    await usersApi.update(editTarget.id, {
      name: values.name,
      mobile: values.mobile ?? '',
      email: values.email ?? '',
      active: values.active,
    });
    await loadUsers();
    setEditTarget(null);
  };

  const submitReset = async () => {
    if (!resetTarget || newPassword.length < 4) return;
    await usersApi.resetPassword(resetTarget.id, newPassword);
    setResetTarget(null);
    setNewPassword('');
  };

  const eventChipsFor = (user: User) =>
    user.counterIds
      .map((cid) => counters.find((c) => c.id === cid))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => ({ counter: c, event: allEvents.find((e) => e.id === c.eventId) }));

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">{t('counterEmployees.title')}</Typography>
        <Button startIcon={<PersonAddIcon />} variant="contained" onClick={openCreate}>
          {t('counterEmployees.createEmployee')}
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('common.name')}</TableCell>
              <TableCell>{t('common.username')}</TableCell>
              <TableCell>{t('common.mobile')}</TableCell>
              <TableCell>{t('counterEmployees.assignedEvents')}</TableCell>
              <TableCell>{t('common.active')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.mobile || '-'}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    {eventChipsFor(user).map(({ counter, event }) => (
                      <Chip
                        key={counter.id}
                        size="small"
                        label={`${event?.name ?? t('counterLayout.unknownEvent')} (${counter.code})`}
                        onDelete={() => unassign(user, counter.id)}
                      />
                    ))}
                    {user.counterIds.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {t('counterEmployees.noEventsAssigned')}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.active}
                    size="small"
                    onChange={async () => {
                      await usersApi.update(user.id, { active: !user.active });
                      await loadUsers();
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t('counterEmployees.assignToEvent')}>
                    <IconButton size="small" onClick={() => openAssign(user)}>
                      <AddIcon fontSize="small" color="primary" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.edit')}>
                    <IconButton size="small" onClick={() => openEdit(user)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('eventDetail.resetPassword')}>
                    <IconButton size="small" onClick={() => setResetTarget(user)}>
                      <KeyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {t('counterEmployees.noEmployeesYet')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Create Employee */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('counterEmployees.createEmployee')}</DialogTitle>
        <Box component="form" onSubmit={createForm.handleSubmit(submitCreate)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label={t('common.name')}
                fullWidth
                error={!!createForm.formState.errors.name}
                helperText={createForm.formState.errors.name?.message && t(createForm.formState.errors.name.message)}
                {...createForm.register('name', {
                  onChange: (e) => {
                    const name = e.target.value;
                    if (!usernameTouchedRef.current) createForm.setValue('username', slugifyName(name));
                    if (!passwordTouchedRef.current) createForm.setValue('password', passwordFromName(name));
                  },
                })}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('common.username')}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!createForm.formState.errors.username}
                  helperText={
                    createForm.formState.errors.username?.message && t(createForm.formState.errors.username.message)
                  }
                  {...createForm.register('username', { onChange: () => { usernameTouchedRef.current = true; } })}
                />
                <TextField
                  label={t('common.password')}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!createForm.formState.errors.password}
                  helperText={
                    createForm.formState.errors.password?.message && t(createForm.formState.errors.password.message)
                  }
                  {...createForm.register('password', { onChange: () => { passwordTouchedRef.current = true; } })}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('common.mobile')}
                  fullWidth
                  error={!!createForm.formState.errors.mobile}
                  helperText={
                    createForm.formState.errors.mobile?.message && t(createForm.formState.errors.mobile.message)
                  }
                  {...createForm.register('mobile')}
                />
                <TextField
                  label={t('common.email')}
                  fullWidth
                  error={!!createForm.formState.errors.email}
                  helperText={
                    createForm.formState.errors.email?.message && t(createForm.formState.errors.email.message)
                  }
                  {...createForm.register('email')}
                />
              </Stack>

              <Typography variant="subtitle2">{t('counterEmployees.assignOptional')}</Typography>
              <Controller
                name="eventId"
                control={createForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label={t('common.event')}
                    fullWidth
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      createForm.setValue('counterId', '');
                    }}
                  >
                    <MenuItem value="">{t('counterEmployees.unassignedForNow')}</MenuItem>
                    {events.map((ev) => (
                      <MenuItem key={ev.id} value={ev.id}>
                        {ev.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              {createEventId && createAvailableCounters.length === 0 && (
                <Alert severity="info">{t('counterEmployees.noAvailableCounters')}</Alert>
              )}
              {createEventId && createAvailableCounters.length > 0 && (
                <Controller
                  name="counterId"
                  control={createForm.control}
                  render={({ field }) => (
                    <TextField {...field} select label={t('common.counter')} fullWidth>
                      {createAvailableCounters.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={createForm.formState.isSubmitting}>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Assign to Event */}
      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {t('counterEmployees.assignToEvent')} — {assignTarget?.name}
        </DialogTitle>
        <Box component="form" onSubmit={assignForm.handleSubmit(submitAssign)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <Controller
                name="eventId"
                control={assignForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label={t('common.event')}
                    fullWidth
                    error={!!assignForm.formState.errors.eventId}
                    helperText={
                      assignForm.formState.errors.eventId?.message && t(assignForm.formState.errors.eventId.message)
                    }
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      assignForm.setValue('counterId', '');
                    }}
                  >
                    {events.map((ev) => (
                      <MenuItem key={ev.id} value={ev.id}>
                        {ev.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              {selectedEventId && availableCounters.length === 0 && (
                <Alert severity="info">{t('counterEmployees.noAvailableCounters')}</Alert>
              )}
              {selectedEventId && availableCounters.length > 0 && (
                <Controller
                  name="counterId"
                  control={assignForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label={t('common.counter')}
                      fullWidth
                      error={!!assignForm.formState.errors.counterId}
                      helperText={
                        assignForm.formState.errors.counterId?.message && t(assignForm.formState.errors.counterId.message)
                      }
                    >
                      {availableCounters.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAssignTarget(null)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={!selectedEventId || availableCounters.length === 0}>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Employee */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('counterEmployees.editEmployee')}</DialogTitle>
        <Box component="form" onSubmit={editForm.handleSubmit(submitEdit)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label={t('common.name')} fullWidth {...editForm.register('name')} />
              <TextField label={t('common.mobile')} fullWidth {...editForm.register('mobile')} />
              <TextField label={t('common.email')} fullWidth {...editForm.register('email')} />
              <Controller
                name="active"
                control={editForm.control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                    label={t('common.active')}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditTarget(null)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={!!resetTarget} onClose={() => setResetTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {t('eventDetail.resetPassword')} — {resetTarget?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={t('eventDetail.newPassword')}
            fullWidth
            sx={{ mt: 1 }}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText={t('eventDetail.passwordHelper')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" disabled={newPassword.length < 4} onClick={submitReset}>
            {t('eventDetail.reset')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
