import { CssBaseline, ThemeProvider } from '@mui/material';
import { Box, CircularProgress } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './app/router';
import { getTheme } from './app/theme';
import ErrorBoundary from './components/common/ErrorBoundary';
import {
  migrateCounterEmployeeRole,
  migrateLegacyCategories,
  migrateLegacyEvents,
  migrateLegacyUsers,
  seedIfEmpty,
} from './services/mock/seed';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useThemeStore } from './store/themeStore';

export default function App() {
  const init = useAuthStore((s) => s.init);
  const initializing = useAuthStore((s) => s.initializing);
  const loadSettings = useSettingsStore((s) => s.loadAll);
  const mode = useThemeStore((s) => s.mode);
  const theme = useMemo(() => getTheme(mode), [mode]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfEmpty();
    migrateLegacyUsers();
    migrateCounterEmployeeRole();
    migrateLegacyEvents();
    migrateLegacyCategories();
    Promise.all([init(), loadSettings()]).then(() => setReady(true));
  }, [init, loadSettings]);

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        {initializing || !ready ? (
          <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <ErrorBoundary>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </ErrorBoundary>
        )}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
