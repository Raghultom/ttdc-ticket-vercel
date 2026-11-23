import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Avatar, Box, Button, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as settingsApi from '../../services/api/settings';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { GeneralSettings as GeneralSettingsModel } from '../../types/models';
import { generalSettingsSchema, type GeneralSettingsFormValues } from '../../utils/validators';

const FALLBACK_GENERAL: GeneralSettingsModel = {
  logoUrl: '',
  footerText: '',
  ticketValiditySameDayOnly: true,
  defaultPrinterSize: '80mm',
};

export default function Settings() {
  const { t } = useTranslation();
  const generalSettings = useSettingsStore((s) => s.generalSettings);
  const refresh = useSettingsStore((s) => s.refreshGeneralSettings);
  const user = useAuthStore((s) => s.user);
  const [saved, setSaved] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: generalSettings ?? FALLBACK_GENERAL,
  });

  useEffect(() => {
    if (generalSettings) reset(generalSettings);
  }, [generalSettings, reset]);

  const logoUrl = watch('logoUrl');

  const handleLogoChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setValue('logoUrl', String(reader.result));
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: GeneralSettingsFormValues) => {
    if (!user) return;
    setSaved(false);
    await settingsApi.updateGeneral(values, { id: user.id, name: user.name });
    await refresh();
    setSaved(true);
  };

  if (!generalSettings) return null;

  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      <Typography variant="h5">{t('settings.title')}</Typography>

      <Alert severity="info">{t('settings.notice')}</Alert>

      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2}>
            {saved && <Alert severity="success">{t('settings.saved')}</Alert>}

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar src={logoUrl || undefined} variant="rounded" sx={{ width: 56, height: 56 }} />
              <Button component="label" variant="outlined">
                {t('settings.uploadLogo')}
                <input hidden type="file" accept="image/*" onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)} />
              </Button>
            </Stack>

            <TextField label={t('settings.footerText')} fullWidth multiline minRows={2} {...register('footerText')} />

            <Controller
              name="defaultPrinterSize"
              control={control}
              render={({ field }) => (
                <TextField select label={t('settings.defaultPrinterSize')} {...field}>
                  <MenuItem value="58mm">58mm (Thermal)</MenuItem>
                  <MenuItem value="80mm">80mm (Thermal)</MenuItem>
                  <MenuItem value="A5">A5</MenuItem>
                  <MenuItem value="A4">A4</MenuItem>
                </TextField>
              )}
            />

            <Controller
              name="ticketValiditySameDayOnly"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
                  label={t('settings.ticketValiditySameDay')}
                />
              )}
            />

            <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ alignSelf: 'flex-start' }}>
              {t('settings.saveSettings')}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}
