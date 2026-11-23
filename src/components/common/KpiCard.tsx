import { Box, Paper, Stack, Typography, alpha, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon?: ReactNode;
  color?: string;
}

function resolvePaletteColor(theme: Theme, colorPath: string): string {
  const [key, shade] = colorPath.split('.');
  const group = (theme.palette as unknown as Record<string, Record<string, string> | undefined>)[key];
  if (group && shade && shade in group) return group[shade];
  return colorPath;
}

export default function KpiCard({ label, value, subtext, icon, color = 'primary.main' }: KpiCardProps) {
  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        },
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Stack spacing={0.5}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}
          >
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          {subtext && (
            <Typography variant="caption" color="text.secondary">
              {subtext}
            </Typography>
          )}
        </Stack>
        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) => alpha(resolvePaletteColor(theme, color), 0.12),
              color,
              fontSize: 24,
            }}
          >
            {icon}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
