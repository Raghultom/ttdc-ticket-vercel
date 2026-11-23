import { zodResolver } from '@hookform/resolvers/zod';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Step,
  StepLabel,
  Stepper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ROLES } from '../../constants/roles';
import * as categoriesApi from '../../services/api/categories';
import * as countersApi from '../../services/api/counters';
import * as eventsApi from '../../services/api/events';
import * as usersApi from '../../services/api/users';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Event, User } from '../../types/models';
import { categoryCodeFromName, nextCounterCode, passwordFromName, slugifyName } from '../../utils/autoFill';
import { formatCurrency, rupeesToPaise } from '../../utils/format';
import { visibleCounterEmployees } from '../../utils/scope';
import {
  categorySchema,
  counterWithExistingSubAdminSchema,
  counterWithSubAdminSchema,
  eventSchema,
  type CategoryFormValues,
  type CounterWithExistingSubAdminFormValues,
  type CounterWithSubAdminFormValues,
  type EventFormValues,
} from '../../utils/validators';

const emptyEventDefaults: EventFormValues = {
  name: '',
  venue: '',
  city: '',
  dateFrom: '',
  dateTo: '',
  timingsStart: '10:00',
  timingsEnd: '20:00',
};

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

const emptyCategoryDefaults: CategoryFormValues = {
  code: '',
  name: '',
  price: 0,
  priceIncludesGst: true,
  ageRule: '',
  isFree: false,
  active: true,
  sortOrder: 1,
  effectiveFrom: null,
  effectiveTo: null,
};

type CounterMode = 'new' | 'existing';

type StagedCounter = {
  tempId: string;
  code: string;
  name: string;
  location: string;
  allowedPaymentModes: CounterWithSubAdminFormValues['allowedPaymentModes'];
  ticketPrefix: string;
  mode: CounterMode;
  employeeName?: string;
  employeeUsername?: string;
  employeePassword?: string;
  employeeMobile?: string;
  employeeEmail?: string;
  existingUserId?: string;
  existingUserLabel?: string;
};

type StagedCategory = CategoryFormValues & { tempId: string };

interface CreateEventWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: (event: Event) => void;
}

export default function CreateEventWizard({ open, onClose, onCreated }: CreateEventWizardProps) {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const refreshEvents = useSettingsStore((s) => s.refreshEvents);
  const refreshCounters = useSettingsStore((s) => s.refreshCounters);
  const refreshCategories = useSettingsStore((s) => s.refreshCategories);

  const [activeStep, setActiveStep] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [counterMode, setCounterMode] = useState<CounterMode>('new');
  const [stagedCounters, setStagedCounters] = useState<StagedCounter[]>([]);
  const [stagedCategories, setStagedCategories] = useState<StagedCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextTempId = useRef(0);
  const genTempId = () => String(nextTempId.current++);
  const usernameTouchedRef = useRef(false);
  const passwordTouchedRef = useRef(false);
  const categoryCodeTouchedRef = useRef(false);

  const eventForm = useForm<EventFormValues>({ resolver: zodResolver(eventSchema), defaultValues: emptyEventDefaults });
  const counterForm = useForm<CounterWithSubAdminFormValues>({
    resolver: zodResolver(counterWithSubAdminSchema),
    defaultValues: emptyCounterDefaults,
  });
  const existingCounterForm = useForm<CounterWithExistingSubAdminFormValues>({
    resolver: zodResolver(counterWithExistingSubAdminSchema),
    defaultValues: emptyExistingCounterDefaults,
  });
  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyCategoryDefaults,
  });

  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    setStagedCounters([]);
    setStagedCategories([]);
    setCounterMode('new');
    setError(null);
    eventForm.reset(emptyEventDefaults);
    counterForm.reset({ ...emptyCounterDefaults, code: nextCounterCode(0) });
    existingCounterForm.reset({ ...emptyExistingCounterDefaults, code: nextCounterCode(0) });
    categoryForm.reset(emptyCategoryDefaults);
    usernameTouchedRef.current = false;
    passwordTouchedRef.current = false;
    categoryCodeTouchedRef.current = false;
    usersApi.list().then(setUsers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!currentUser) return null;
  const employeeOptions = visibleCounterEmployees(currentUser, users);

  const addStagedCounterNew = counterForm.handleSubmit((v) => {
    setStagedCounters((prev) => [
      ...prev,
      {
        tempId: genTempId(),
        code: v.code,
        name: v.name,
        location: v.location,
        allowedPaymentModes: v.allowedPaymentModes,
        ticketPrefix: v.ticketPrefix,
        mode: 'new',
        employeeName: v.subAdminName,
        employeeUsername: v.subAdminUsername,
        employeePassword: v.subAdminPassword,
        employeeMobile: v.subAdminMobile,
        employeeEmail: v.subAdminEmail,
      },
    ]);
    counterForm.reset({ ...emptyCounterDefaults, code: nextCounterCode(stagedCounters.length + 1) });
    usernameTouchedRef.current = false;
    passwordTouchedRef.current = false;
  });

  const addStagedCounterExisting = existingCounterForm.handleSubmit((v) => {
    const employee = employeeOptions.find((u) => u.id === v.existingSubAdminId);
    setStagedCounters((prev) => [
      ...prev,
      {
        tempId: genTempId(),
        code: v.code,
        name: v.name,
        location: v.location,
        allowedPaymentModes: v.allowedPaymentModes,
        ticketPrefix: v.ticketPrefix,
        mode: 'existing',
        existingUserId: v.existingSubAdminId,
        existingUserLabel: employee?.name ?? '',
      },
    ]);
    existingCounterForm.reset({ ...emptyExistingCounterDefaults, code: nextCounterCode(stagedCounters.length + 1) });
  });

  const removeStagedCounter = (tempId: string) => {
    setStagedCounters((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  const addStagedCategory = categoryForm.handleSubmit((v) => {
    setStagedCategories((prev) => [...prev, { ...v, tempId: genTempId() }]);
    categoryForm.reset({ ...emptyCategoryDefaults, sortOrder: v.sortOrder + 1 });
    categoryCodeTouchedRef.current = false;
  });

  const removeStagedCategory = (tempId: string) => {
    setStagedCategories((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  const goNext = async () => {
    if (activeStep === 0) {
      const valid = await eventForm.trigger();
      if (!valid) return;
    }
    setActiveStep((s) => s + 1);
  };

  const goBack = () => setActiveStep((s) => s - 1);

  const handleFinish = async () => {
    const valid = await eventForm.trigger();
    if (!valid) {
      setActiveStep(0);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const details = eventForm.getValues();
      const event = await eventsApi.create({
        ...details,
        createdBy: currentUser.role === ROLES.SUB_ADMIN ? currentUser.id : null,
      });

      for (const sc of stagedCounters) {
        const counter = await countersApi.create({
          eventId: event.id,
          code: sc.code,
          name: sc.name,
          location: sc.location,
          allowedPaymentModes: sc.allowedPaymentModes,
          ticketPrefix: sc.ticketPrefix,
          active: true,
        });
        if (sc.mode === 'new') {
          await usersApi.create({
            name: sc.employeeName ?? '',
            username: sc.employeeUsername ?? '',
            password: sc.employeePassword ?? '',
            role: ROLES.COUNTER_EMPLOYEE,
            counterIds: [counter.id],
            mobile: sc.employeeMobile ?? '',
            email: sc.employeeEmail ?? '',
            active: true,
            createdBy: currentUser.id,
          });
        } else if (sc.existingUserId) {
          await usersApi.assignCounter(sc.existingUserId, counter.id);
        }
      }

      for (const cat of stagedCategories) {
        await categoriesApi.create({
          eventId: event.id,
          code: cat.code,
          name: cat.name,
          price: cat.isFree ? 0 : rupeesToPaise(cat.price),
          priceIncludesGst: cat.priceIncludesGst,
          ageRule: cat.ageRule,
          isFree: cat.isFree,
          sortOrder: cat.sortOrder,
          active: cat.active,
          effectiveFrom: null,
          effectiveTo: null,
        });
      }

      await Promise.all([refreshEvents(), refreshCounters(), refreshCategories()]);
      onCreated(event);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('events.createEvent')}</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Stepper activeStep={activeStep}>
            <Step>
              <StepLabel>{t('eventWizard.stepDetails')}</StepLabel>
            </Step>
            <Step>
              <StepLabel>{t('eventWizard.stepCounters')}</StepLabel>
            </Step>
            <Step>
              <StepLabel>{t('eventWizard.stepPrices')}</StepLabel>
            </Step>
          </Stepper>

          {error && <Alert severity="error">{error}</Alert>}

          {activeStep === 0 && (
            <Stack spacing={2}>
              <TextField
                label={t('events.eventName')}
                fullWidth
                error={!!eventForm.formState.errors.name}
                helperText={eventForm.formState.errors.name?.message && t(eventForm.formState.errors.name.message)}
                {...eventForm.register('name')}
              />
              <Stack direction="row" spacing={2}>
                <TextField label={t('common.venue')} fullWidth {...eventForm.register('venue')} />
                <TextField
                  label={t('common.city')}
                  fullWidth
                  error={!!eventForm.formState.errors.city}
                  helperText={eventForm.formState.errors.city?.message && t(eventForm.formState.errors.city.message)}
                  {...eventForm.register('city')}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('events.startDate')}
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!eventForm.formState.errors.dateFrom}
                  helperText={eventForm.formState.errors.dateFrom?.message && t(eventForm.formState.errors.dateFrom.message)}
                  {...eventForm.register('dateFrom')}
                />
                <TextField
                  label={t('events.endDate')}
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!eventForm.formState.errors.dateTo}
                  helperText={eventForm.formState.errors.dateTo?.message && t(eventForm.formState.errors.dateTo.message)}
                  {...eventForm.register('dateTo')}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('events.timingsStart')}
                  type="time"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...eventForm.register('timingsStart')}
                />
                <TextField
                  label={t('events.timingsEnd')}
                  type="time"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...eventForm.register('timingsEnd')}
                />
              </Stack>
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t('eventWizard.countersHint')}
              </Typography>
              <Tabs value={counterMode} onChange={(_, v) => setCounterMode(v)}>
                <Tab value="new" label={t('eventDetail.newSubAdminTab')} />
                <Tab value="existing" label={t('eventDetail.existingSubAdminTab')} />
              </Tabs>
              {counterMode === 'new' ? (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label={t('eventDetail.counterCode')}
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      error={!!counterForm.formState.errors.code}
                      helperText={counterForm.formState.errors.code?.message && t(counterForm.formState.errors.code.message)}
                      {...counterForm.register('code')}
                    />
                    <TextField
                      label={t('eventDetail.counterName')}
                      fullWidth
                      size="small"
                      error={!!counterForm.formState.errors.name}
                      helperText={counterForm.formState.errors.name?.message && t(counterForm.formState.errors.name.message)}
                      {...counterForm.register('name')}
                    />
                  </Stack>
                  <TextField label={t('eventDetail.location')} fullWidth size="small" {...counterForm.register('location')} />
                  <Controller
                    name="allowedPaymentModes"
                    control={counterForm.control}
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
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label={t('common.name')}
                      fullWidth
                      size="small"
                      error={!!counterForm.formState.errors.subAdminName}
                      helperText={
                        counterForm.formState.errors.subAdminName?.message && t(counterForm.formState.errors.subAdminName.message)
                      }
                      {...counterForm.register('subAdminName', {
                        onChange: (e) => {
                          const name = e.target.value;
                          if (!usernameTouchedRef.current) counterForm.setValue('subAdminUsername', slugifyName(name));
                          if (!passwordTouchedRef.current) counterForm.setValue('subAdminPassword', passwordFromName(name));
                        },
                      })}
                    />
                    <TextField
                      label={t('common.username')}
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      error={!!counterForm.formState.errors.subAdminUsername}
                      helperText={
                        counterForm.formState.errors.subAdminUsername?.message &&
                        t(counterForm.formState.errors.subAdminUsername.message)
                      }
                      {...counterForm.register('subAdminUsername', { onChange: () => { usernameTouchedRef.current = true; } })}
                    />
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label={t('common.password')}
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      error={!!counterForm.formState.errors.subAdminPassword}
                      helperText={
                        counterForm.formState.errors.subAdminPassword?.message &&
                        t(counterForm.formState.errors.subAdminPassword.message)
                      }
                      {...counterForm.register('subAdminPassword', { onChange: () => { passwordTouchedRef.current = true; } })}
                    />
                    <TextField label={t('common.mobile')} fullWidth size="small" {...counterForm.register('subAdminMobile')} />
                  </Stack>
                  <Button variant="outlined" onClick={addStagedCounterNew}>
                    {t('eventWizard.addCounterButton')}
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label={t('eventDetail.counterCode')}
                      fullWidth
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                      error={!!existingCounterForm.formState.errors.code}
                      helperText={
                        existingCounterForm.formState.errors.code?.message && t(existingCounterForm.formState.errors.code.message)
                      }
                      {...existingCounterForm.register('code')}
                    />
                    <TextField
                      label={t('eventDetail.counterName')}
                      fullWidth
                      size="small"
                      error={!!existingCounterForm.formState.errors.name}
                      helperText={
                        existingCounterForm.formState.errors.name?.message && t(existingCounterForm.formState.errors.name.message)
                      }
                      {...existingCounterForm.register('name')}
                    />
                  </Stack>
                  <Controller
                    name="allowedPaymentModes"
                    control={existingCounterForm.control}
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
                  <Controller
                    name="existingSubAdminId"
                    control={existingCounterForm.control}
                    render={({ field }) => (
                      <Autocomplete
                        options={employeeOptions}
                        getOptionLabel={(u) => `${u.name} (${u.username})`}
                        value={employeeOptions.find((u) => u.id === field.value) ?? null}
                        onChange={(_, value) => field.onChange(value?.id ?? '')}
                        renderInput={(params) => <TextField {...params} size="small" label={t('eventDetail.selectSubAdmin')} />}
                      />
                    )}
                  />
                  <Button variant="outlined" onClick={addStagedCounterExisting}>
                    {t('eventWizard.addCounterButton')}
                  </Button>
                </Stack>
              )}

              <Typography variant="subtitle2">{t('eventWizard.stagedCounters', { count: stagedCounters.length })}</Typography>
              {stagedCounters.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('eventWizard.noStagedCounters')}
                </Typography>
              ) : (
                <List dense disablePadding>
                  {stagedCounters.map((sc) => (
                    <ListItem
                      key={sc.tempId}
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => removeStagedCounter(sc.tempId)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={`${sc.code} — ${sc.name}`}
                        secondary={sc.mode === 'new' ? sc.employeeName : sc.existingUserLabel}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {t('eventWizard.pricesHint')}
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('categories.code')}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!categoryForm.formState.errors.code}
                  helperText={categoryForm.formState.errors.code?.message && t(categoryForm.formState.errors.code.message)}
                  {...categoryForm.register('code', { onChange: () => { categoryCodeTouchedRef.current = true; } })}
                />
                <TextField
                  label={t('categories.name')}
                  fullWidth
                  size="small"
                  error={!!categoryForm.formState.errors.name}
                  helperText={categoryForm.formState.errors.name?.message && t(categoryForm.formState.errors.name.message)}
                  {...categoryForm.register('name', {
                    onChange: (e) => {
                      if (!categoryCodeTouchedRef.current) categoryForm.setValue('code', categoryCodeFromName(e.target.value));
                    },
                  })}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('categories.basePrice')}
                  type="number"
                  fullWidth
                  size="small"
                  error={!!categoryForm.formState.errors.price}
                  helperText={categoryForm.formState.errors.price?.message && t(categoryForm.formState.errors.price.message)}
                  {...categoryForm.register('price', { valueAsNumber: true })}
                />
                <Controller
                  name="isFree"
                  control={categoryForm.control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                      label={t('categories.freeEntry')}
                    />
                  )}
                />
              </Stack>
              <Button variant="outlined" onClick={addStagedCategory}>
                {t('eventWizard.addCategoryButton')}
              </Button>

              <Typography variant="subtitle2">{t('eventWizard.stagedCategories', { count: stagedCategories.length })}</Typography>
              {stagedCategories.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('eventWizard.noStagedCategories')}
                </Typography>
              ) : (
                <List dense disablePadding>
                  {stagedCategories.map((cat) => (
                    <ListItem
                      key={cat.tempId}
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => removeStagedCategory(cat.tempId)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={`${cat.code} — ${cat.name}`}
                        secondary={cat.isFree ? t('categories.free') : formatCurrency(rupeesToPaise(cat.price))}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        {activeStep > 0 && <Button onClick={goBack}>{t('common.back')}</Button>}
        {activeStep < 2 ? (
          <Button variant="contained" onClick={goNext}>
            {t('common.next')}
          </Button>
        ) : (
          <Button variant="contained" disabled={submitting} onClick={handleFinish}>
            {t('events.createEvent')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
