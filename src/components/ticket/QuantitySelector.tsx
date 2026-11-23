import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { IconButton, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

interface QuantitySelectorProps {
  name: string;
  code: string;
  qty: number;
  unitPrice: number; // paise
  isFree: boolean;
  max: number;
  onChange: (qty: number) => void;
}

export default function QuantitySelector({ name, code, qty, unitPrice, isFree, max, onChange }: QuantitySelectorProps) {
  const { t } = useTranslation();
  const clamp = (value: number) => Math.max(0, Math.min(max, value));

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        bgcolor: qty > 0 ? 'action.selected' : 'background.paper',
      }}
    >
      <Stack sx={{ minWidth: 140 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {code} · {isFree ? t('categories.free') : formatCurrency(unitPrice)}
        </Typography>
      </Stack>

      <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
        <IconButton size="small" onClick={() => onChange(clamp(qty - 1))} disabled={qty <= 0} data-testid={`qty-dec-${code}`}>
          <RemoveIcon />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 32, textAlign: 'center' }} data-testid={`qty-value-${code}`}>
          {qty}
        </Typography>
        <IconButton
          size="small"
          onClick={() => onChange(clamp(qty + 1))}
          disabled={qty >= max}
          color="primary"
          data-testid={`qty-inc-${code}`}
        >
          <AddIcon />
        </IconButton>
      </Stack>

      <Typography variant="subtitle1" sx={{ minWidth: 90, textAlign: 'right' }}>
        {isFree ? '-' : formatCurrency(qty * unitPrice)}
      </Typography>
    </Paper>
  );
}
