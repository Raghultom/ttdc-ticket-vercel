import EventIcon from '@mui/icons-material/Event';
import LogoutIcon from '@mui/icons-material/Logout';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { formatDateTime } from '../utils/format';

const TABS = [
  { to: '/counter/issue', labelKey: 'nav.issueTicket' },
  { to: '/counter/history', labelKey: 'nav.history' },
  { to: '/counter/shift-close', labelKey: 'nav.shiftClose' },
  { to: '/counter/settings', labelKey: 'nav.printerSettings' },
];

export default function CounterLayout() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeCounterId = useAuthStore((s) => s.activeCounterId);
  const setActiveCounter = useAuthStore((s) => s.setActiveCounter);
  const counters = useSettingsStore((s) => s.counters);
  const events = useSettingsStore((s) => s.events);
  const logoUrl = useSettingsStore((s) => s.generalSettings?.logoUrl);
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(() => new Date().toISOString());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toISOString()), 1000);
    return () => clearInterval(id);
  }, []);

  const myCounterIds = useMemo(() => user?.counterIds ?? [], [user]);
  const validActiveCounterId = activeCounterId && myCounterIds.includes(activeCounterId) ? activeCounterId : null;

  useEffect(() => {
    if (!validActiveCounterId && myCounterIds.length === 1) {
      setActiveCounter(myCounterIds[0]);
    }
  }, [validActiveCounterId, myCounterIds, setActiveCounter]);

  const counter = useMemo(() => counters.find((c) => c.id === validActiveCounterId), [counters, validActiveCounterId]);
  const event = useMemo(() => events.find((e) => e.id === counter?.eventId), [events, counter]);

  const myAssignments = useMemo(
    () =>
      myCounterIds
        .map((cid) => counters.find((c) => c.id === cid))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => ({ counter: c, event: events.find((e) => e.id === c.eventId) })),
    [myCounterIds, counters, events],
  );

  const activeTab = TABS.find((tab) => location.pathname.startsWith(tab.to))?.to ?? TABS[0].to;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const showPicker = !validActiveCounterId;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary">
        <Toolbar sx={{ gap: 2 }}>
          {logoUrl && (
            <Box
              component="img"
              src={logoUrl}
              alt="logo"
              sx={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 1, bgcolor: 'common.white', p: 0.5 }}
            />
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {counter ? `${event ? `${event.name} · ` : ''}${counter.code} — ${counter.name}` : t('common.counter')}
          </Typography>
          {myCounterIds.length > 1 && !showPicker && (
            <Button
              size="small"
              color="inherit"
              startIcon={<SwapHorizIcon />}
              onClick={() => setActiveCounter(null)}
              sx={{ borderColor: 'rgba(255,255,255,0.5)' }}
              variant="outlined"
            >
              {t('counterLayout.switchEvent')}
            </Button>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: '0.875rem', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2">{user?.name}</Typography>
          </Stack>
          <Typography variant="body2" sx={{ minWidth: 190, textAlign: 'right' }}>
            {formatDateTime(now)}
          </Typography>
          <Tooltip title={t('common.logout')}>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        {!showPicker && (
          <Tabs
            value={activeTab}
            onChange={(_, value) => navigate(value)}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ bgcolor: 'primary.dark' }}
          >
            {TABS.map((tab) => (
              <Tab key={tab.to} value={tab.to} label={t(tab.labelKey)} />
            ))}
          </Tabs>
        )}
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
        {showPicker ? (
          <EventPicker
            assignments={myAssignments}
            onSelect={(counterId) => setActiveCounter(counterId)}
            noAssignments={myCounterIds.length === 0}
          />
        ) : (
          <Outlet />
        )}
      </Box>
    </Box>
  );
}

function EventPicker({
  assignments,
  onSelect,
  noAssignments,
}: {
  assignments: Array<{ counter: { id: string; code: string; name: string }; event: { id: string; name: string } | undefined }>;
  onSelect: (counterId: string) => void;
  noAssignments: boolean;
}) {
  const { t } = useTranslation();

  if (noAssignments) {
    return (
      <Stack sx={{ alignItems: 'center', mt: 6 }} spacing={1}>
        <Typography variant="h6">{t('counterLayout.noAssignmentsTitle')}</Typography>
        <Typography color="text.secondary">{t('counterLayout.noAssignmentsBody')}</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 560, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" sx={{ textAlign: 'center' }}>
        {t('counterLayout.selectEventTitle')}
      </Typography>
      <Stack spacing={1.5}>
        {assignments.map(({ counter, event }) => (
          <Card key={counter.id} variant="outlined">
            <CardActionArea onClick={() => onSelect(counter.id)}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <EventIcon color="primary" />
                  <Stack>
                    <Typography variant="subtitle1">{event?.name ?? t('counterLayout.unknownEvent')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {counter.code} — {counter.name}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
