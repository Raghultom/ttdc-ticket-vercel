import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../../i18n';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={i18n.language === 'ta' ? 'ta' : 'en'}
      onChange={(_, lang) => lang && setLanguage(lang)}
      sx={{ bgcolor: 'rgba(255,255,255,0.1)', '& .MuiToggleButton-root': { color: 'inherit', borderColor: 'rgba(255,255,255,0.3)' } }}
    >
      <ToggleButton value="en">{t('language.english')}</ToggleButton>
      <ToggleButton value="ta">{t('language.tamil')}</ToggleButton>
    </ToggleButtonGroup>
  );
}
