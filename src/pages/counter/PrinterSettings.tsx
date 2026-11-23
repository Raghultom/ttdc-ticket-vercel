import { Alert, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePrinterSettingsStore } from '../../store/printerSettingsStore';

export default function PrinterSettings() {
  const { t } = useTranslation();
  const paperSize = usePrinterSettingsStore((s) => s.paperSize);
  const setPaperSize = usePrinterSettingsStore((s) => s.setPaperSize);

  return (
    <Stack spacing={2} sx={{ maxWidth: 420 }}>
      <Typography variant="h5">{t('printerSettings.title')}</Typography>
      <Alert severity="info">{t('printerSettings.notice')}</Alert>
      <Paper sx={{ p: 3 }}>
        <TextField
          select
          fullWidth
          label={t('printerSettings.paperSize')}
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value as typeof paperSize)}
        >
          <MenuItem value="58mm">58mm (Thermal)</MenuItem>
          <MenuItem value="80mm">80mm (Thermal)</MenuItem>
          <MenuItem value="A5">A5</MenuItem>
          <MenuItem value="A4">A4</MenuItem>
        </TextField>
      </Paper>
    </Stack>
  );
}
