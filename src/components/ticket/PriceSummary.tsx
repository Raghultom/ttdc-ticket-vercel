import { Divider, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { BillingResult } from '../../utils/billing';
import { formatCurrency } from '../../utils/format';

interface PriceSummaryProps {
  billing: BillingResult;
  gstEnabled: boolean;
  splitType: 'CGST_SGST' | 'IGST';
}

export default function PriceSummary({ billing, gstEnabled, splitType }: PriceSummaryProps) {
  const { t } = useTranslation();
  const items = billing.items.filter((i) => i.qty > 0);

  return (
    <Paper variant="outlined" sx={{ p: 2, fontFamily: 'monospace' }}>
      <Stack spacing={0.5}>
        {items.length === 0 && (
          <Typography color="text.secondary" sx={{ fontFamily: 'inherit' }}>
            {t('issueTicket.noItemsSelected')}
          </Typography>
        )}
        {items.map((item) => (
          <Stack key={item.categoryId} direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: 'inherit' }}>
              {item.name} {item.qty} × {(item.unitPrice / 100).toFixed(2)}
            </Typography>
            <Typography sx={{ fontFamily: 'inherit' }}>{(item.amount / 100).toFixed(2)}</Typography>
          </Stack>
        ))}

        <Divider sx={{ my: 1 }} />

        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography sx={{ fontFamily: 'inherit' }}>{t('issueTicket.taxableValue')}</Typography>
          <Typography sx={{ fontFamily: 'inherit' }}>{(billing.taxableValue / 100).toFixed(2)}</Typography>
        </Stack>

        {gstEnabled && splitType === 'CGST_SGST' && (
          <>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography sx={{ fontFamily: 'inherit' }}>{t('issueTicket.cgst')}</Typography>
              <Typography sx={{ fontFamily: 'inherit' }}>{(billing.cgst / 100).toFixed(2)}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <Typography sx={{ fontFamily: 'inherit' }}>{t('issueTicket.sgst')}</Typography>
              <Typography sx={{ fontFamily: 'inherit' }}>{(billing.sgst / 100).toFixed(2)}</Typography>
            </Stack>
          </>
        )}
        {gstEnabled && splitType === 'IGST' && (
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: 'inherit' }}>{t('tax.igst')}</Typography>
            <Typography sx={{ fontFamily: 'inherit' }}>{(billing.igst / 100).toFixed(2)}</Typography>
          </Stack>
        )}
        {billing.roundOff !== 0 && (
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: 'inherit' }}>{t('issueTicket.roundOff')}</Typography>
            <Typography sx={{ fontFamily: 'inherit' }}>{(billing.roundOff / 100).toFixed(2)}</Typography>
          </Stack>
        )}

        <Divider sx={{ my: 1 }} />

        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontFamily: 'inherit' }}>
            {t('print.total')}
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: 'inherit' }}>
            {formatCurrency(billing.finalTotal)}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'inherit' }}>
          {t('issueTicket.totalPersonsLabel', { count: billing.totalPersons })}
        </Typography>
      </Stack>
    </Paper>
  );
}
