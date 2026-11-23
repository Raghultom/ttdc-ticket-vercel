import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';

export default function ThemeToggle() {
  const { t } = useTranslation();
  const mode = useThemeStore((s) => s.mode);
  const toggleMode = useThemeStore((s) => s.toggleMode);

  return (
    <Tooltip title={mode === 'light' ? t('common.switchToDark') : t('common.switchToLight')}>
      <IconButton color="inherit" onClick={toggleMode}>
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
