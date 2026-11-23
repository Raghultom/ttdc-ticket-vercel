import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { PaymentMode } from '../../constants/paymentModes';

interface PaymentModeSelectorProps {
  allowedModes: PaymentMode[];
  value: PaymentMode | null;
  onChange: (mode: PaymentMode) => void;
  disabled?: boolean;
}

const LABEL_KEYS: Record<PaymentMode, string> = {
  CASH: 'issueTicket.cash',
  UPI: 'issueTicket.upiRazorpay',
  UPI_MANUAL: 'issueTicket.upiManual',
};

export default function PaymentModeSelector({ allowedModes, value, onChange, disabled }: PaymentModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      value={value}
      onChange={(_, next) => next && onChange(next)}
      disabled={disabled}
      color="primary"
    >
      {allowedModes.map((mode) => (
        <ToggleButton key={mode} value={mode} sx={{ py: 1.5, fontWeight: 600 }}>
          {t(LABEL_KEYS[mode])}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
