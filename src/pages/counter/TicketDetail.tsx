import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useTicketPrinter } from '../../components/print/useTicketPrinter';
import { PAYMENT_MODE_LABEL_KEYS } from '../../constants/paymentModes';
import { TICKET_STATUS_LABEL_KEYS } from '../../constants/ticketStatus';
import * as ticketsApi from '../../services/api/tickets';
import { useAuthStore } from '../../store/authStore';
import { usePrinterSettingsStore } from '../../store/printerSettingsStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Ticket } from '../../types/models';
import { formatCurrency, formatDateTime, maskMobile } from '../../utils/format';

export default function TicketDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const events = useSettingsStore((s) => s.events);
  const generalSettings = useSettingsStore((s) => s.generalSettings);
  const paperSize = usePrinterSettingsStore((s) => s.paperSize);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reprintOpen, setReprintOpen] = useState(false);
  const [reason, setReason] = useState('');

  const { print, portal } = useTicketPrinter(
    events,
    generalSettings ?? {
      logoUrl: '',
      footerText: '',
      ticketValiditySameDayOnly: true,
      defaultPrinterSize: paperSize,
    },
    paperSize,
  );

  useEffect(() => {
    if (id) ticketsApi.getById(id).then(setTicket);
  }, [id]);

  const confirmReprint = async () => {
    if (!ticket || !user) return;
    const updated = await ticketsApi.reprint(ticket.id, { id: user.id, name: user.name }, reason || 'Reprint requested');
    setTicket(updated);
    print(updated, true);
    setReprintOpen(false);
  };

  if (!ticket) return null;

  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      {portal}
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ alignSelf: 'flex-start' }}>
        {t('common.back')}
      </Button>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{ticket.ticketNo}</Typography>
          <Chip
            label={t(TICKET_STATUS_LABEL_KEYS[ticket.status])}
            color={ticket.status === 'PAID' ? 'success' : ticket.status === 'CANCELLED' ? 'error' : 'warning'}
          />
        </Stack>

        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell>{t('ticketDetail.dateTime')}</TableCell>
              <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('ticketDetail.counter')}</TableCell>
              <TableCell>{ticket.counterCode}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('ticketDetail.issuedBy')}</TableCell>
              <TableCell>{ticket.issuedByName}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('ticketDetail.visitor')}</TableCell>
              <TableCell>{ticket.visitorName || '-'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('ticketDetail.mobile')}</TableCell>
              <TableCell>{maskMobile(ticket.visitorMobile)}</TableCell>
            </TableRow>
            {ticket.items.map((item) => (
              <TableRow key={item.categoryId}>
                <TableCell>
                  {item.name} × {item.qty}
                </TableCell>
                <TableCell>{formatCurrency(item.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell>{t('ticketDetail.taxableValue')}</TableCell>
              <TableCell>{formatCurrency(ticket.taxableValue)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('ticketDetail.cgstSgstIgst')}</TableCell>
              <TableCell>
                {formatCurrency(ticket.cgst)} / {formatCurrency(ticket.sgst)} / {formatCurrency(ticket.igst)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>{t('ticketDetail.total')}</strong>
              </TableCell>
              <TableCell>
                <strong>{formatCurrency(ticket.totalAmount)}</strong>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('ticketDetail.payment')}</TableCell>
              <TableCell>
                {t(PAYMENT_MODE_LABEL_KEYS[ticket.paymentMode])}{' '}
                {ticket.payment.razorpayPaymentId ? `(${ticket.payment.razorpayPaymentId})` : ''}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('ticketDetail.printCount')}</TableCell>
              <TableCell>{ticket.printCount}</TableCell>
            </TableRow>
            {ticket.cancelReason && (
              <TableRow>
                <TableCell>{t('ticketDetail.cancelReason')}</TableCell>
                <TableCell>{ticket.cancelReason}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {ticket.status === 'PAID' && (
          <Button sx={{ mt: 2 }} variant="contained" startIcon={<PrintIcon />} onClick={() => setReprintOpen(true)}>
            {t('ticketDetail.reprint')}
          </Button>
        )}
      </Paper>

      <Dialog open={reprintOpen} onClose={() => setReprintOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('ticketDetail.reprintTicket')}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('ticketDetail.reprintNotice')}
          </Alert>
          <TextField label={t('common.reasonOptional')} fullWidth value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReprintOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={confirmReprint}>
            {t('ticketDetail.reprint')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
