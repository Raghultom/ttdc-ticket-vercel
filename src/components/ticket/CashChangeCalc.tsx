import { Alert, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatCurrency, rupeesToPaise } from '../../utils/format';

interface CashChangeCalcProps {
  totalAmount: number; // paise
  cashReceived: string;
  onChange: (value: string) => void;
}

export default function CashChangeCalc({ totalAmount, cashReceived, onChange }: CashChangeCalcProps) {
  const { t } = useTranslation();
  const receivedPaise = cashReceived ? rupeesToPaise(Number(cashReceived)) : null;
  const change = receivedPaise !== null ? receivedPaise - totalAmount : null;
  const insufficient = change !== null && change < 0;

  return (
    <Stack spacing={1}>
      <TextField
        label={t('issueTicket.amountReceivedLabel')}
        type="number"
        value={cashReceived}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
      />
      {change !== null && !insufficient && (
        <Typography variant="h6">{t('issueTicket.changeToReturn', { amount: formatCurrency(change) })}</Typography>
      )}
      {insufficient && <Alert severity="error">{t('issueTicket.insufficientCashError')}</Alert>}
    </Stack>
  );
}
