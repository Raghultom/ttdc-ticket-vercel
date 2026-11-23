import DownloadIcon from '@mui/icons-material/Download';
import { Button, ButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { exportToCsv, exportToExcel } from '../../utils/export';

interface ExportButtonProps<T extends object> {
  rows: T[];
  filename: string;
}

export default function ExportButton<T extends object>({ rows, filename }: ExportButtonProps<T>) {
  const { t } = useTranslation();

  return (
    <ButtonGroup variant="outlined" size="small">
      <Button startIcon={<DownloadIcon />} onClick={() => exportToExcel(rows, filename)} disabled={rows.length === 0}>
        {t('common.excel')}
      </Button>
      <Button onClick={() => exportToCsv(rows, filename)} disabled={rows.length === 0}>
        {t('common.csv')}
      </Button>
    </ButtonGroup>
  );
}
