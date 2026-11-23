import { zodResolver } from '@hookform/resolvers/zod';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
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
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as categoriesApi from '../../services/api/categories';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { categoryCodeFromName } from '../../utils/autoFill';
import { formatCurrency, paiseToRupees, rupeesToPaise } from '../../utils/format';
import { categorySchema, type CategoryFormValues } from '../../utils/validators';
import type { TicketCategory } from '../../types/models';
import { visibleEvents } from '../../utils/scope';

const emptyDefaults: CategoryFormValues = {
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

export default function Categories() {
  const { t } = useTranslation();
  const allCategories = useSettingsStore((s) => s.categories);
  const allEvents = useSettingsStore((s) => s.events);
  const refresh = useSettingsStore((s) => s.refreshCategories);
  const refreshEvents = useSettingsStore((s) => s.refreshEvents);
  const user = useAuthStore((s) => s.user);

  const [eventId, setEventId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TicketCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const codeTouchedRef = useRef(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema), defaultValues: emptyDefaults });

  const isFree = watch('isFree');

  useEffect(() => {
    refresh();
    refreshEvents();
  }, [refresh, refreshEvents]);

  const events = useMemo(() => (user ? visibleEvents(user, allEvents) : []), [user, allEvents]);

  useEffect(() => {
    if (!eventId && events.length > 0) setEventId(events[0].id);
  }, [eventId, events]);

  const categories = useMemo(() => allCategories.filter((c) => c.eventId === eventId), [allCategories, eventId]);

  const openCreate = () => {
    setEditing(null);
    reset(emptyDefaults);
    codeTouchedRef.current = false;
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (category: TicketCategory) => {
    setEditing(category);
    codeTouchedRef.current = true;
    reset({
      code: category.code,
      name: category.name,
      price: paiseToRupees(category.price),
      priceIncludesGst: category.priceIncludesGst,
      ageRule: category.ageRule,
      isFree: category.isFree,
      active: category.active,
      sortOrder: category.sortOrder,
      effectiveFrom: category.effectiveFrom,
      effectiveTo: category.effectiveTo,
    });
    setError(null);
    setDialogOpen(true);
  };

  const onSubmit = async (values: CategoryFormValues, keepOpen: boolean) => {
    if (!user || !eventId) return;
    setError(null);
    const payload = {
      ...values,
      price: values.isFree ? 0 : rupeesToPaise(values.price),
    };
    try {
      if (editing) {
        await categoriesApi.update(editing.id, payload, { id: user.id, name: user.name });
      } else {
        await categoriesApi.create({ ...payload, eventId });
      }
      await refresh();
      if (keepOpen) {
        reset({ ...emptyDefaults, sortOrder: values.sortOrder + 1 });
        codeTouchedRef.current = false;
      } else {
        setDialogOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const toggleActive = async (category: TicketCategory) => {
    if (!user) return;
    await categoriesApi.toggleActive(category.id, { id: user.id, name: user.name });
    await refresh();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">{t('categories.title')}</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate} disabled={!eventId}>
          {t('categories.addCategory')}
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <TextField
          select
          size="small"
          label={t('common.event')}
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {events.map((ev) => (
            <MenuItem key={ev.id} value={ev.id}>
              {ev.name}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {events.length === 0 ? (
        <Alert severity="info">{t('categories.noEventYet')}</Alert>
      ) : (
        <Alert severity="info">{t('categories.priceChangeNotice')}</Alert>
      )}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('categories.sort')}</TableCell>
              <TableCell>{t('categories.code')}</TableCell>
              <TableCell>{t('categories.name')}</TableCell>
              <TableCell align="right">{t('categories.price')}</TableCell>
              <TableCell>{t('categories.inclGst')}</TableCell>
              <TableCell>{t('categories.ageRule')}</TableCell>
              <TableCell>{t('categories.free')}</TableCell>
              <TableCell>{t('common.active')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id} hover>
                <TableCell>{cat.sortOrder}</TableCell>
                <TableCell>{cat.code}</TableCell>
                <TableCell>{cat.name}</TableCell>
                <TableCell align="right">{cat.isFree ? t('categories.free') : formatCurrency(cat.price)}</TableCell>
                <TableCell>{cat.priceIncludesGst ? t('common.yes') : t('common.no')}</TableCell>
                <TableCell>{cat.ageRule || '-'}</TableCell>
                <TableCell>{cat.isFree ? t('common.yes') : t('common.no')}</TableCell>
                <TableCell>
                  <Switch checked={cat.active} onChange={() => toggleActive(cat)} size="small" />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => openEdit(cat)} size="small">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  {t('categories.noCategoriesYet')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? t('categories.editCategory') : t('categories.addCategory')}</DialogTitle>
        <Box component="form" onSubmit={(e) => e.preventDefault()} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('categories.code')}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={!!errors.code}
                  helperText={errors.code?.message && t(errors.code.message)}
                  {...register('code', { onChange: () => { codeTouchedRef.current = true; } })}
                />
                <TextField
                  label={t('categories.name')}
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message && t(errors.name.message)}
                  {...register('name', {
                    onChange: (e) => {
                      if (!codeTouchedRef.current) setValue('code', categoryCodeFromName(e.target.value));
                    },
                  })}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('categories.basePrice')}
                  type="number"
                  fullWidth
                  disabled={isFree}
                  error={!!errors.price}
                  helperText={errors.price?.message && t(errors.price.message)}
                  {...register('price', { valueAsNumber: true })}
                />
                <TextField
                  label={t('categories.sortOrder')}
                  type="number"
                  fullWidth
                  error={!!errors.sortOrder}
                  helperText={errors.sortOrder?.message && t(errors.sortOrder.message)}
                  {...register('sortOrder', { valueAsNumber: true })}
                />
              </Stack>
              <TextField label={t('categories.ageRulePlaceholder')} fullWidth {...register('ageRule')} />
              <Stack direction="row" spacing={3}>
                <Controller
                  name="priceIncludesGst"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                      label={t('categories.priceIncludesGst')}
                    />
                  )}
                />
                <Controller
                  name="isFree"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                      label={t('categories.freeEntry')}
                    />
                  )}
                />
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                      label={t('common.active')}
                    />
                  )}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            {!editing && (
              <Button
                variant="outlined"
                disabled={isSubmitting}
                onClick={handleSubmit((v) => onSubmit(v, true))}
              >
                {t('categories.saveAndAddAnother')}
              </Button>
            )}
            <Button variant="contained" disabled={isSubmitting} onClick={handleSubmit((v) => onSubmit(v, false))}>
              {t('common.save')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
