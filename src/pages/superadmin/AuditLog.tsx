import { Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import * as auditLogApi from '../../services/api/auditLog';
import type { AuditLog as AuditLogModel } from '../../types/models';
import { formatDateTime } from '../../utils/format';

const ACTION_COLORS: Record<string, 'default' | 'warning' | 'error' | 'info' | 'success'> = {
  PRICE_CHANGE: 'warning',
  REPRINT: 'info',
  CANCEL: 'error',
  LOGIN: 'success',
  SETTINGS_CHANGE: 'default',
};

function describeDetails(entry: AuditLogModel, t: TFunction): string {
  const d = entry.details;
  switch (entry.action) {
    case 'PRICE_CHANGE':
      return t('auditLog.priceChangeDetail', {
        name: d.categoryName,
        oldPrice: Number(d.oldPrice) / 100,
        newPrice: Number(d.newPrice) / 100,
      });
    case 'REPRINT':
      return d.reason ? t('auditLog.reprintDetail', { ticketNo: d.ticketNo, reason: d.reason }) : String(d.ticketNo);
    case 'CANCEL':
      return t('auditLog.cancelDetail', { ticketNo: d.ticketNo, reason: d.reason });
    case 'LOGIN':
      return t('auditLog.loginDetail', { username: d.username });
    case 'SETTINGS_CHANGE':
      return t('auditLog.settingsChangeDetail', { type: d.type });
    default:
      return JSON.stringify(d);
  }
}

export default function AuditLog() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogModel[]>([]);

  useEffect(() => {
    auditLogApi.list().then(setLogs);
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t('auditLog.title')}</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('auditLog.when')}</TableCell>
              <TableCell>{t('auditLog.action')}</TableCell>
              <TableCell>{t('auditLog.by')}</TableCell>
              <TableCell>{t('auditLog.details')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{formatDateTime(log.at)}</TableCell>
                <TableCell>
                  <Chip size="small" label={t(`auditLog.actions.${log.action}`)} color={ACTION_COLORS[log.action] ?? 'default'} />
                </TableCell>
                <TableCell>{log.byName}</TableCell>
                <TableCell>{describeDetails(log, t)}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  {t('auditLog.noEvents')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
