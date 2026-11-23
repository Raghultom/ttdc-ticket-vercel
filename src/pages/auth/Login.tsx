import { zodResolver } from '@hookform/resolvers/zod';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventIcon from '@mui/icons-material/Event';
import GroupsIcon from '@mui/icons-material/Groups';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { Alert, alpha, Avatar, Box, Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { homeRouteForRole } from '../../app/homeRoute';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import ThemeToggle from '../../components/common/ThemeToggle';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { loginSchema, type LoginFormValues } from '../../utils/validators';

const FEATURES: { icon: ReactNode; labelKey: string }[] = [
  { icon: <EventIcon fontSize="small" />, labelKey: 'auth.featureMultiEvent' },
  { icon: <ReceiptLongIcon fontSize="small" />, labelKey: 'auth.featureGst' },
  { icon: <GroupsIcon fontSize="small" />, labelKey: 'auth.featureRoles' },
];

export default function Login() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const logoUrl = useSettingsStore((s) => s.generalSettings?.logoUrl);
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      const user = await login(values.username, values.password);
      navigate(homeRouteForRole(user.role), { replace: true });
    } catch (err) {
      setSubmitError(t(err instanceof Error ? err.message : 'auth.loginFailed'));
    }
  };

  const appName = import.meta.env.VITE_APP_NAME || t('app.name');

  const brandMark = logoUrl ? (
    <Box component="img" src={logoUrl} alt="logo" sx={{ height: 48, width: 48, objectFit: 'contain' }} />
  ) : (
    <Avatar sx={{ width: 48, height: 48, bgcolor: 'secondary.main', color: 'secondary.contrastText', fontSize: '1.25rem' }}>
      {appName.charAt(0)}
    </Avatar>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Brand panel */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          width: { md: '42%' },
          bgcolor: 'primary.dark',
          color: 'common.white',
          px: 7,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.06),
            top: -90,
            left: -90,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 200,
            height: 200,
            borderRadius: '50%',
            bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.2),
            bottom: -60,
            right: -50,
          }}
        />
        <ConfirmationNumberIcon
          sx={{
            position: 'absolute',
            fontSize: 340,
            opacity: 0.05,
            right: -60,
            top: '50%',
            transform: 'translateY(-50%) rotate(-18deg)',
          }}
        />

        <Stack spacing={5} sx={{ position: 'relative', zIndex: 1, maxWidth: 380 }}>
          <Stack spacing={2}>
            {brandMark}
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {appName}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85 }}>
              {t('app.ticketingSystem')}
            </Typography>
          </Stack>

          <Stack spacing={2.5}>
            {FEATURES.map((f) => (
              <Stack key={f.labelKey} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha('#fff', 0.12),
                    flexShrink: 0,
                  }}
                >
                  {f.icon}
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {t(f.labelKey)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Box>

      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          bgcolor: 'background.default',
          px: 2,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 16, right: 16 }}>
          <ThemeToggle />
          <LanguageSwitcher />
        </Stack>

        <Box sx={{ width: 380, maxWidth: '100%' }}>
          <Stack
            spacing={1}
            sx={{ mb: 4, alignItems: { xs: 'center', md: 'flex-start' }, textAlign: { xs: 'center', md: 'left' } }}
          >
            <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1 }}>{brandMark}</Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t('auth.welcomeBack')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('auth.signInToContinue')}
            </Typography>
          </Stack>

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              {submitError && <Alert severity="error">{submitError}</Alert>}
              <TextField
                label={t('common.username')}
                autoFocus
                fullWidth
                error={!!errors.username}
                helperText={errors.username?.message && t(errors.username.message)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register('username')}
              />
              <TextField
                label={t('common.password')}
                type="password"
                fullWidth
                error={!!errors.password}
                helperText={errors.password?.message && t(errors.password.message)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register('password')}
              />
              <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
