import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as settingsApi from '../../services/api/settings';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { TaxSettings as TaxSettingsModel } from '../../types/models';
import { taxSettingsSchema, type TaxSettingsFormValues } from '../../utils/validators';

const FALLBACK_TAX: TaxSettingsModel = {
  gstEnabled: true,
  gstRate: 18,
  splitType: 'CGST_SGST',
  pricingMode: 'INCLUSIVE',
  gstin: '',
  sacCode: '',
  roundOff: true,
};

export default function TaxSettings() {
  const { t } = useTranslation();
  const taxSettings = useSettingsStore((s) => s.taxSettings);
  const refresh = useSettingsStore((s) => s.refreshTaxSettings);
  const user = useAuthStore((s) => s.user);
  const [saved, setSaved] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaxSettingsFormValues>({ resolver: zodResolver(taxSettingsSchema), defaultValues: taxSettings ?? FALLBACK_TAX });

  useEffect(() => {
    if (taxSettings) reset(taxSettings);
  }, [taxSettings, reset]);

  const gstEnabled = watch('gstEnabled');

  const onSubmit = async (values: TaxSettingsFormValues) => {
    if (!user) return;
    setSaved(false);
    await settingsApi.updateTax(values, { id: user.id, name: user.name });
    await refresh();
    setSaved(true);
  };

  if (!taxSettings) return null;

  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      <Typography variant="h5">{t('tax.title')}</Typography>
      <Alert severity="warning">{t('tax.notice')}</Alert>

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            {saved && <Alert severity="success">{t('tax.saved')}</Alert>}

            <Controller
              name="gstEnabled"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                  label={t('tax.gstEnabled')}
                />
              )}
            />

            <TextField
              label={t('tax.gstRate')}
              type="number"
              disabled={!gstEnabled}
              error={!!errors.gstRate}
              helperText={errors.gstRate?.message && t(errors.gstRate.message)}
              {...register('gstRate', { valueAsNumber: true })}
            />

            <Controller
              name="splitType"
              control={control}
              render={({ field }) => (
                <TextField select label={t('tax.splitType')} disabled={!gstEnabled} {...field}>
                  <MenuItem value="CGST_SGST">{t('tax.cgstSgstIntra')}</MenuItem>
                  <MenuItem value="IGST">{t('tax.igst')}</MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="pricingMode"
              control={control}
              render={({ field }) => (
                <TextField select label={t('tax.pricingMode')} disabled={!gstEnabled} {...field}>
                  <MenuItem value="INCLUSIVE">{t('tax.inclusive')}</MenuItem>
                  <MenuItem value="EXCLUSIVE">{t('tax.exclusive')}</MenuItem>
                </TextField>
              )}
            />

            <TextField label={t('tax.gstin')} {...register('gstin')} />
            <TextField label={t('tax.sacCode')} {...register('sacCode')} />

            <Controller
              name="roundOff"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                  label={t('tax.roundOff')}
                />
              )}
            />

            <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ alignSelf: 'flex-start' }}>
              {t('tax.saveSettings')}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}
