import { Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

export interface DateRangeValue {
  dateFrom: string;
  dateTo: string;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

const PRESETS = ['Today', 'Yesterday', 'This Week'] as const;

const PRESET_LABEL_KEYS: Record<(typeof PRESETS)[number], string> = {
  Today: 'common.today',
  Yesterday: 'common.yesterday',
  'This Week': 'common.thisWeek',
};

function presetRange(preset: (typeof PRESETS)[number]): DateRangeValue {
  const today = dayjs();
  if (preset === 'Today') {
    return { dateFrom: today.format('YYYY-MM-DD'), dateTo: today.format('YYYY-MM-DD') };
  }
  if (preset === 'Yesterday') {
    const y = today.subtract(1, 'day').format('YYYY-MM-DD');
    return { dateFrom: y, dateTo: y };
  }
  return { dateFrom: today.startOf('week').format('YYYY-MM-DD'), dateTo: today.format('YYYY-MM-DD') };
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const { t } = useTranslation();

  return (
    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <ToggleButtonGroup size="small" exclusive onChange={(_, preset) => preset && onChange(presetRange(preset))}>
        {PRESETS.map((p) => (
          <ToggleButton key={p} value={p}>
            {t(PRESET_LABEL_KEYS[p])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <TextField
        label={t('common.from')}
        type="date"
        size="small"
        value={value.dateFrom}
        onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label={t('common.to')}
        type="date"
        size="small"
        value={value.dateTo}
        onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </Stack>
  );
}
