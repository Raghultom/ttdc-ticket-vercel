import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ROLES } from '../../constants/roles';
import * as countersApi from '../../services/api/counters';
import * as usersApi from '../../services/api/users';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Counter, User } from '../../types/models';
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABEL_KEYS, getEventStatus } from '../../utils/eventStatus';
import { formatDate } from '../../utils/format';
import { basePathForRole, isOwnEvent, visibleCounterEmployees } from '../../utils/scope';
import { nextCounterCode, passwordFromName, slugifyName } from '../../utils/autoFill';
import {
  counterWithExistingSubAdminSchema,
  counterWithSubAdminSchema,
  subAdminSchema,
  type CounterWithExistingSubAdminFormValues,
  type CounterWithSubAdminFormValues,
  type SubAdminFormValues,
} from '../../utils/validators';

const emptyCounterDefaults: CounterWithSubAdminFormValues = {
  code: '',
  name: '',
  location: '',
  allowedPaymentModes: ['CASH', 'UPI'],
  ticketPrefix: 'TTF',
  subAdminName: '',
  subAdminUsername: '',
  subAdminPassword: '',
  subAdminMobile: '',
  subAdminEmail: '',
};

const emptyExistingCounterDefaults: CounterWithExistingSubAdminFormValues = {
  code: '',
  name: '',
  location: '',
  allowedPaymentModes: ['CASH', 'UPI'],
  ticketPrefix: 'TTF',
  existingSubAdminId: '',
};

type AddMode = 'new' | 'existing';

export default function EventDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const events = useSettingsStore((s) => s.events);
  const counters = useSettingsStore((s) => s.counters);
  const refreshCounters = useSettingsStore((s) => s.refreshCounters);

  const rawEvent = events.find((e) => e.id === id);
  const event = rawEvent && currentUser && isOwnEvent(currentUser, rawEvent) ? rawEvent : undefined;
  const eventCounters = counters.filter((c) => c.eventId === id);
  const base = currentUser ? basePathForRole(currentUser) : '/sa';

  const [users, setUsers] = useState<User[]>([]);
  const [addCounterOpen, setAddCounterOpen] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('new');
  const [editCounterTarget, setEditCounterTarget] = useState<Counter | null>(null);
  const [editSubAdminTarget, setEditSubAdminTarget] = useState<{ counter: Counter; user: User } | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<{ counter: Counter; user: User } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const usernameTouchedRef = useRef(false);
  const passwordTouchedRef = useRef(false);

  const loadUsers = useCallback(async () => {
    setUsers(await usersApi.list());
  }, []);

  useEffect(() => {
    refreshCounters();
    loadUsers();
  }, [refreshCounters, loadUsers]);

  const addForm = useForm<CounterWithSubAdminFormValues>({
    resolver: zodResolver(counterWithSubAdminSchema),
    defaultValues: emptyCounterDefaults,
  });

  const addExistingForm = useForm<CounterWithExistingSubAdminFormValues>({
    resolver: zodResolver(counterWithExistingSubAdminSchema),
    defaultValues: emptyExistingCounterDefaults,
  });

  const editCounterForm = useForm<CounterWithSubAdminFormValues>({
    resolver: zodResolver(counterWithSubAdminSchema),
    defaultValues: emptyCounterDefaults,
  });

  const subAdminForm = useForm<SubAdminFormValues>({
    resolver: zodResolver(subAdminSchema),
    defaultValues: { name: '', mobile: '', email: '', active: true },
  });

  if (!event || !currentUser) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">{t('events.eventNotFound')}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`${base}/events`)} sx={{ alignSelf: 'flex-start' }}>
          {t('events.backToEvents')}
        </Button>
      </Stack>
    );
  }

  const status = getEventStatus(event);
  const subAdminFor = (counterId: string) =>
    users.find((u) => u.counterIds.includes(counterId) && u.role === ROLES.COUNTER_EMPLOYEE);
  const subAdminOptions = visibleCounterEmployees(currentUser, users);

  const openAddCounter = () => {
    const suggestedCode = nextCounterCode(eventCounters.length);
    addForm.reset({ ...emptyCounterDefaults, code: suggestedCode });
    addExistingForm.reset({ ...emptyExistingCounterDefaults, code: suggestedCode });
    usernameTouchedRef.current = false;
    passwordTouchedRef.current = false;
    setAddMode('new');
    setError(null);
    setAddCounterOpen(true);
  };

  const submitAddCounter = async (values: CounterWithSubAdminFormValues) => {
    setError(null);
    try {
      const counter = await countersApi.create({
        eventId: event.id,
        code: values.code,
        name: values.name,
        location: values.location,
        allowedPaymentModes: values.allowedPaymentModes,
        ticketPrefix: values.ticketPrefix,
        active: true,
      });
      await usersApi.create({
        name: values.subAdminName,
        username: values.subAdminUsername,
        password: values.subAdminPassword,
        role: ROLES.COUNTER_EMPLOYEE,
        counterIds: [counter.id],
        mobile: values.subAdminMobile ?? '',
        email: values.subAdminEmail ?? '',
        active: true,
        createdBy: currentUser.id,
      });
      await refreshCounters();
      await loadUsers();
      setAddCounterOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const submitAddCounterExisting = async (values: CounterWithExistingSubAdminFormValues) => {
    setError(null);
    try {
      const counter = await countersApi.create({
        eventId: event.id,
        code: values.code,
        name: values.name,
        location: values.location,
        allowedPaymentModes: values.allowedPaymentModes,
        ticketPrefix: values.ticketPrefix,
        active: true,
      });
      await usersApi.assignCounter(values.existingSubAdminId, counter.id);
      await refreshCounters();
      await loadUsers();
      setAddCounterOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const confirmUnassign = async () => {
    if (!unassignTarget) return;
    await usersApi.unassignCounter(unassignTarget.user.id, unassignTarget.counter.id);
    await loadUsers();
    setUnassignTarget(null);
  };

  const openEditCounter = (counter: Counter) => {
    editCounterForm.reset({
      code: counter.code,
      name: counter.name,
      location: counter.location,
      allowedPaymentModes: counter.allowedPaymentModes,
      ticketPrefix: counter.ticketPrefix,
      subAdminName: '',
      subAdminUsername: '',
      subAdminPassword: '',
      subAdminMobile: '',
      subAdminEmail: '',
    });
    setError(null);
    setEditCounterTarget(counter);
  };

  const submitEditCounter = async (values: CounterWithSubAdminFormValues) => {
    if (!editCounterTarget) return;
    setError(null);
    try {
      await countersApi.update(editCounterTarget.id, {
        code: values.code,
        name: values.name,
        location: values.location,
        allowedPaymentModes: values.allowedPaymentModes,
        ticketPrefix: values.ticketPrefix,
      });
      await refreshCounters();
      setEditCounterTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const toggleCounterActive = async (counter: Counter) => {
    await countersApi.update(counter.id, { active: !counter.active });
    await refreshCounters();
  };

  const openEditSubAdmin = (counter: Counter, user: User) => {
    subAdminForm.reset({ name: user.name, mobile: user.mobile, email: user.email, active: user.active });
    setEditSubAdminTarget({ counter, user });
  };

  const submitEditSubAdmin = async (values: SubAdminFormValues) => {
    if (!editSubAdminTarget) return;
    await usersApi.update(editSubAdminTarget.user.id, {
      name: values.name,
      mobile: values.mobile ?? '',
      email: values.email ?? '',
      active: values.active,
    });
    await loadUsers();
    setEditSubAdminTarget(null);
  };

  const submitReset = async () => {
    if (!resetTarget || newPassword.length < 4) return;
    await usersApi.resetPassword(resetTarget.id, newPassword);
    setResetTarget(null);
    setNewPassword('');
  };

  return (
    <Stack spacing={2}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`${base}/events`)} sx={{ alignSelf: 'flex-start' }}>
        {t('events.backToEvents')}
      </Button>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }} spacing={1}>
          <Stack>
            <Typography variant="h5">{event.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {event.venue}
              {event.venue && event.city ? ', ' : ''}
              {event.city} · {formatDate(event.dateFrom)} – {formatDate(event.dateTo)} · {event.timingsStart}-
              {event.timingsEnd}
            </Typography>
          </Stack>
          <Chip label={t(EVENT_STATUS_LABEL_KEYS[status])} color={EVENT_STATUS_COLORS[status]} />
        </Stack>
      </Paper>

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{t('eventDetail.countersAndSubAdmins')}</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openAddCounter}>
          {t('eventDetail.addCounter')}
        </Button>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('common.counter')}</TableCell>
              <TableCell>{t('eventDetail.location')}</TableCell>
              <TableCell>{t('common.subAdmin')}</TableCell>
              <TableCell>{t('common.mobile')}</TableCell>
              <TableCell>{t('common.email')}</TableCell>
              <TableCell>{t('common.active')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventCounters.map((counter) => {
              const sa = subAdminFor(counter.id);
              return (
                <TableRow key={counter.id} hover>
                  <TableCell>
                    {counter.code} — {counter.name}
                  </TableCell>
                  <TableCell>{counter.location || '-'}</TableCell>
                  <TableCell>{sa?.name ?? '-'}</TableCell>
                  <TableCell>{sa?.mobile || '-'}</TableCell>
                  <TableCell>{sa?.email || '-'}</TableCell>
                  <TableCell>
                    <Switch checked={counter.active} onChange={() => toggleCounterActive(counter)} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={t('eventDetail.editCounter')}>
                      <IconButton size="small" onClick={() => openEditCounter(counter)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {sa && (
                      <>
                        <Tooltip title={t('eventDetail.editSubAdmin')}>
                          <IconButton size="small" onClick={() => openEditSubAdmin(counter, sa)}>
                            <EditIcon fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('eventDetail.resetPassword')}>
                          <IconButton size="small" onClick={() => setResetTarget(sa)}>
                            <KeyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('eventDetail.unassignSubAdmin')}>
                          <IconButton size="small" onClick={() => setUnassignTarget({ counter, user: sa })}>
                            <PersonRemoveIcon fontSize="small" color="error" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {eventCounters.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {t('eventDetail.noCountersYet')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Add Counter + Sub Admin */}
      <Dialog open={addCounterOpen} onClose={() => setAddCounterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('eventDetail.addCounterAndSubAdmin')}</DialogTitle>
        <Tabs value={addMode} onChange={(_, v) => setAddMode(v)} sx={{ px: 3 }}>
          <Tab value="new" label={t('eventDetail.newSubAdminTab')} />
          <Tab value="existing" label={t('eventDetail.existingSubAdminTab')} />
        </Tabs>
        {addMode === 'new' ? (
          <Box component="form" onSubmit={addForm.handleSubmit(submitAddCounter)} noValidate>
            <DialogContent>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <Typography variant="subtitle2">{t('eventDetail.counterSection')}</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('eventDetail.counterCode')}
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!addForm.formState.errors.code}
                    helperText={addForm.formState.errors.code?.message && t(addForm.formState.errors.code.message)}
                    {...addForm.register('code')}
                  />
                  <TextField
                    label={t('eventDetail.counterName')}
                    fullWidth
                    error={!!addForm.formState.errors.name}
                    helperText={addForm.formState.errors.name?.message && t(addForm.formState.errors.name.message)}
                    {...addForm.register('name')}
                  />
                </Stack>
                <TextField label={t('eventDetail.location')} fullWidth {...addForm.register('location')} />
                <TextField
                  label={t('eventDetail.ticketPrefix')}
                  fullWidth
                  error={!!addForm.formState.errors.ticketPrefix}
                  helperText={addForm.formState.errors.ticketPrefix?.message && t(addForm.formState.errors.ticketPrefix.message)}
                  {...addForm.register('ticketPrefix')}
                />
                <Controller
                  name="allowedPaymentModes"
                  control={addForm.control}
                  render={({ field }) => (
                    <FormGroup row>
                      {(['CASH', 'UPI', 'UPI_MANUAL'] as const).map((mode) => (
                        <FormControlLabel
                          key={mode}
                          control={
                            <Switch
                              checked={field.value.includes(mode)}
                              onChange={(_, checked) =>
                                field.onChange(checked ? [...field.value, mode] : field.value.filter((m) => m !== mode))
                              }
                            />
                          }
                          label={mode}
                        />
                      ))}
                    </FormGroup>
                  )}
                />

                <Typography variant="subtitle2">{t('eventDetail.subAdminSection')}</Typography>
                <TextField
                  label={t('common.name')}
                  fullWidth
                  error={!!addForm.formState.errors.subAdminName}
                  helperText={addForm.formState.errors.subAdminName?.message && t(addForm.formState.errors.subAdminName.message)}
                  {...addForm.register('subAdminName', {
                    onChange: (e) => {
                      const name = e.target.value;
                      if (!usernameTouchedRef.current) addForm.setValue('subAdminUsername', slugifyName(name));
                      if (!passwordTouchedRef.current) addForm.setValue('subAdminPassword', passwordFromName(name));
                    },
                  })}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('common.username')}
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!addForm.formState.errors.subAdminUsername}
                    helperText={
                      addForm.formState.errors.subAdminUsername?.message && t(addForm.formState.errors.subAdminUsername.message)
                    }
                    {...addForm.register('subAdminUsername', { onChange: () => { usernameTouchedRef.current = true; } })}
                  />
                  <TextField
                    label={t('common.password')}
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!addForm.formState.errors.subAdminPassword}
                    helperText={
                      addForm.formState.errors.subAdminPassword?.message && t(addForm.formState.errors.subAdminPassword.message)
                    }
                    {...addForm.register('subAdminPassword', { onChange: () => { passwordTouchedRef.current = true; } })}
                  />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('common.mobile')}
                    fullWidth
                    error={!!addForm.formState.errors.subAdminMobile}
                    helperText={
                      addForm.formState.errors.subAdminMobile?.message && t(addForm.formState.errors.subAdminMobile.message)
                    }
                    {...addForm.register('subAdminMobile')}
                  />
                  <TextField
                    label={t('common.email')}
                    fullWidth
                    error={!!addForm.formState.errors.subAdminEmail}
                    helperText={addForm.formState.errors.subAdminEmail?.message && t(addForm.formState.errors.subAdminEmail.message)}
                    {...addForm.register('subAdminEmail')}
                  />
                </Stack>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setAddCounterOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="contained" disabled={addForm.formState.isSubmitting}>
                {t('common.save')}
              </Button>
            </DialogActions>
          </Box>
        ) : (
          <Box component="form" onSubmit={addExistingForm.handleSubmit(submitAddCounterExisting)} noValidate>
            <DialogContent>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <Typography variant="subtitle2">{t('eventDetail.counterSection')}</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label={t('eventDetail.counterCode')}
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    error={!!addExistingForm.formState.errors.code}
                    helperText={
                      addExistingForm.formState.errors.code?.message && t(addExistingForm.formState.errors.code.message)
                    }
                    {...addExistingForm.register('code')}
                  />
                  <TextField
                    label={t('eventDetail.counterName')}
                    fullWidth
                    error={!!addExistingForm.formState.errors.name}
                    helperText={
                      addExistingForm.formState.errors.name?.message && t(addExistingForm.formState.errors.name.message)
                    }
                    {...addExistingForm.register('name')}
                  />
                </Stack>
                <TextField label={t('eventDetail.location')} fullWidth {...addExistingForm.register('location')} />
                <TextField
                  label={t('eventDetail.ticketPrefix')}
                  fullWidth
                  error={!!addExistingForm.formState.errors.ticketPrefix}
                  helperText={
                    addExistingForm.formState.errors.ticketPrefix?.message &&
                    t(addExistingForm.formState.errors.ticketPrefix.message)
                  }
                  {...addExistingForm.register('ticketPrefix')}
                />
                <Controller
                  name="allowedPaymentModes"
                  control={addExistingForm.control}
                  render={({ field }) => (
                    <FormGroup row>
                      {(['CASH', 'UPI', 'UPI_MANUAL'] as const).map((mode) => (
                        <FormControlLabel
                          key={mode}
                          control={
                            <Switch
                              checked={field.value.includes(mode)}
                              onChange={(_, checked) =>
                                field.onChange(checked ? [...field.value, mode] : field.value.filter((m) => m !== mode))
                              }
                            />
                          }
                          label={mode}
                        />
                      ))}
                    </FormGroup>
                  )}
                />

                <Typography variant="subtitle2">{t('eventDetail.subAdminSection')}</Typography>
                <Controller
                  name="existingSubAdminId"
                  control={addExistingForm.control}
                  render={({ field }) => (
                    <Autocomplete
                      options={subAdminOptions}
                      getOptionLabel={(u) => `${u.name} (${u.username})`}
                      value={subAdminOptions.find((u) => u.id === field.value) ?? null}
                      onChange={(_, value) => field.onChange(value?.id ?? '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('eventDetail.selectSubAdmin')}
                          error={!!addExistingForm.formState.errors.existingSubAdminId}
                          helperText={
                            addExistingForm.formState.errors.existingSubAdminId?.message &&
                            t(addExistingForm.formState.errors.existingSubAdminId.message)
                          }
                        />
                      )}
                    />
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setAddCounterOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="contained" disabled={addExistingForm.formState.isSubmitting}>
                {t('common.save')}
              </Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>

      {/* Edit Counter */}
      <Dialog open={!!editCounterTarget} onClose={() => setEditCounterTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('eventDetail.editCounter')}</DialogTitle>
        <Box component="form" onSubmit={editCounterForm.handleSubmit(submitEditCounter)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label={t('eventDetail.counterCode')} fullWidth {...editCounterForm.register('code')} />
              <TextField label={t('eventDetail.counterName')} fullWidth {...editCounterForm.register('name')} />
              <TextField label={t('eventDetail.location')} fullWidth {...editCounterForm.register('location')} />
              <TextField label={t('eventDetail.ticketPrefix')} fullWidth {...editCounterForm.register('ticketPrefix')} />
              <Controller
                name="allowedPaymentModes"
                control={editCounterForm.control}
                render={({ field }) => (
                  <FormGroup row>
                    {(['CASH', 'UPI', 'UPI_MANUAL'] as const).map((mode) => (
                      <FormControlLabel
                        key={mode}
                        control={
                          <Switch
                            checked={field.value.includes(mode)}
                            onChange={(_, checked) =>
                              field.onChange(checked ? [...field.value, mode] : field.value.filter((m) => m !== mode))
                            }
                          />
                        }
                        label={mode}
                      />
                    ))}
                  </FormGroup>
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditCounterTarget(null)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="contained">
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Edit Sub Admin */}
      <Dialog open={!!editSubAdminTarget} onClose={() => setEditSubAdminTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('eventDetail.editSubAdmin')}</DialogTitle>
        <Box component="form" onSubmit={subAdminForm.handleSubmit(submitEditSubAdmin)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label={t('common.name')} fullWidth {...subAdminForm.register('name')} />
              <TextField label={t('common.mobile')} fullWidth {...subAdminForm.register('mobile')} />
              <TextField label={t('common.email')} fullWidth {...subAdminForm.register('email')} />
              <Controller
                name="active"
                control={subAdminForm.control}
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
            <Button onClick={() => setEditSubAdminTarget(null)}>{t('common.cancel')}</Button>
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

      {/* Unassign Sub Admin from this Counter */}
      <Dialog open={!!unassignTarget} onClose={() => setUnassignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('eventDetail.unassignSubAdmin')}</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            {t('eventDetail.unassignConfirm', { name: unassignTarget?.user.name, counter: unassignTarget?.counter.code })}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUnassignTarget(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmUnassign}>
            {t('eventDetail.unassign')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
