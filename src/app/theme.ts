import { alpha, createTheme, type Theme } from '@mui/material/styles';
import type { ThemeMode } from '../store/themeStore';

const FONT_STACK = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',');

const lightPalette = {
  mode: 'light' as const,
  primary: { main: '#0E6B64', dark: '#084D47', light: '#4A9992', contrastText: '#FFFFFF' },
  secondary: { main: '#C8962C', dark: '#9C7220', light: '#DBB35C', contrastText: '#241A05' },
  background: { default: '#F6F5F1', paper: '#FFFFFF' },
  text: { primary: '#1B2422', secondary: '#55625F' },
  divider: 'rgba(14,107,100,0.12)',
};

const darkPalette = {
  mode: 'dark' as const,
  primary: { main: '#3FAFA6', dark: '#1F7A72', light: '#6FC6BE', contrastText: '#06201D' },
  secondary: { main: '#E3BD66', dark: '#C8962C', light: '#EFD28F', contrastText: '#241A05' },
  background: { default: '#0E1513', paper: '#16201E' },
  text: { primary: '#E8EFEC', secondary: '#A9B8B4' },
  divider: 'rgba(255,255,255,0.08)',
};

export function getTheme(mode: ThemeMode): Theme {
  const palette = mode === 'dark' ? darkPalette : lightPalette;

  return createTheme({
    palette,
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: FONT_STACK,
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 600,
            textTransform: 'none',
            paddingInline: 16,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          elevation1: {
            boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${palette.divider}`,
            boxShadow: 'none',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            fontSize: '0.8125rem',
            backgroundColor: alpha(palette.primary.main, 0.04),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
          },
        },
      },
    },
  });
}
