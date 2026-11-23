import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import PercentIcon from '@mui/icons-material/Percent';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  alpha,
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

const DRAWER_WIDTH = 248;

interface NavItem {
  to: string;
  labelKey: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { to: '/sa/dashboard', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
  { to: '/sa/events', labelKey: 'nav.events', icon: <EventIcon /> },
  { to: '/sa/sub-admins', labelKey: 'nav.subAdmins', icon: <PeopleIcon /> },
  { to: '/sa/counter-employees', labelKey: 'nav.counterEmployees', icon: <PeopleIcon /> },
  { to: '/sa/categories', labelKey: 'nav.categories', icon: <CategoryIcon /> },
  { to: '/sa/tax-settings', labelKey: 'nav.taxSettings', icon: <PercentIcon /> },
  { to: '/sa/reports/transactions', labelKey: 'nav.transactionsReport', icon: <ReceiptLongIcon /> },
  { to: '/sa/reports/counters', labelKey: 'nav.counterSubAdminReport', icon: <AssessmentIcon /> },
  { to: '/sa/reports/gst', labelKey: 'nav.gstReport', icon: <PercentIcon /> },
  { to: '/sa/reports/shifts', labelKey: 'nav.shiftReports', icon: <ReceiptLongIcon /> },
  { to: '/sa/audit-log', labelKey: 'nav.auditLog', icon: <HistoryIcon /> },
  { to: '/sa/settings', labelKey: 'nav.generalSettings', icon: <SettingsIcon /> },
];

export default function SuperAdminLayout() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const logoUrl = useSettingsStore((s) => s.generalSettings?.logoUrl);
  const navigate = useNavigate();
  const [drawerOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
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
            {import.meta.env.VITE_APP_NAME || t('app.name')} — {t('nav.superAdmin')}
          </Typography>
          <LanguageSwitcher />
          <ThemeToggle />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ width: 30, height: 30, fontSize: '0.875rem', bgcolor: 'secondary.main', color: 'secondary.contrastText' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2">{user?.name}</Typography>
          </Stack>
          <Tooltip title={t('common.logout')}>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        open={drawerOpen}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List sx={{ px: 1, py: 1 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.active': {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                  fontWeight: 600,
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={t(item.labelKey)} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: `calc(100% - ${DRAWER_WIDTH}px)` }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
