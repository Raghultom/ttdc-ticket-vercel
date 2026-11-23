import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { PAYMENT_MODE_LABEL_KEYS } from '../../constants/paymentModes';
import type { Event, GeneralSettings, PrinterSize, Ticket } from '../../types/models';
import { formatCurrency, formatDateTime, maskMobile } from '../../utils/format';
import './print.css';

interface TicketPrintProps {
  ticket: Ticket;
  event?: Event;
  general: GeneralSettings;
  paperSize: PrinterSize;
  isDuplicate?: boolean;
}

export default function TicketPrint({ ticket, event, general, paperSize, isDuplicate = false }: TicketPrintProps) {
  const { t } = useTranslation();

  return (
    <div className={`ticket-print paper-${paperSize}`}>
      {isDuplicate && <div className="duplicate-banner">{t('print.duplicateCopy')}</div>}

      <div className="center">
        {general.logoUrl && <img src={general.logoUrl} alt="logo" className="logo" />}
        <div>
          <strong>{event?.name ?? t('print.fairFallback')}</strong>
        </div>
        {event?.venue && <div>{event.venue}</div>}
        {event?.timingsStart && event?.timingsEnd && (
          <div>{t('print.timings', { start: event.timingsStart, end: event.timingsEnd })}</div>
        )}
      </div>

      <div className="divider" />

      <div className="row">
        <span>{t('print.ticketNo')}</span>
        <span>{ticket.ticketNo}</span>
      </div>
      <div className="row">
        <span>{t('print.dateTime')}</span>
        <span>{formatDateTime(ticket.createdAt)}</span>
      </div>
      <div className="row">
        <span>{t('print.counter')}</span>
        <span>{ticket.counterCode}</span>
      </div>
      <div className="row">
        <span>{t('print.issuedBy')}</span>
        <span>{ticket.issuedByName}</span>
      </div>
      {ticket.visitorName && (
        <div className="row">
          <span>{t('print.name')}</span>
          <span>{ticket.visitorName}</span>
        </div>
      )}
      {ticket.visitorMobile && (
        <div className="row">
          <span>{t('print.mobile')}</span>
          <span>{maskMobile(ticket.visitorMobile)}</span>
        </div>
      )}

      <div className="divider" />

      <table>
        <tbody>
          <tr>
            <td>
              <strong>{t('print.item')}</strong>
            </td>
            <td>
              <strong>{t('print.qty')}</strong>
            </td>
            <td className="amt">
              <strong>{t('print.rate')}</strong>
            </td>
            <td className="amt">
              <strong>{t('print.amount')}</strong>
            </td>
          </tr>
          {ticket.items.map((item) => (
            <tr key={item.categoryId}>
              <td>{item.name}</td>
              <td>{item.qty}</td>
              <td className="amt">{(item.unitPrice / 100).toFixed(2)}</td>
              <td className="amt">{(item.amount / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="divider" />

      <div className="row">
        <span>{t('print.taxableValue')}</span>
        <span className="amt">{(ticket.taxableValue / 100).toFixed(2)}</span>
      </div>
      {ticket.cgst > 0 && (
        <div className="row">
          <span>
            {t('issueTicket.cgst')} @{(ticket.taxSnapshot.gstRate / 2).toFixed(1)}%
          </span>
          <span className="amt">{(ticket.cgst / 100).toFixed(2)}</span>
        </div>
      )}
      {ticket.sgst > 0 && (
        <div className="row">
          <span>
            {t('issueTicket.sgst')} @{(ticket.taxSnapshot.gstRate / 2).toFixed(1)}%
          </span>
          <span className="amt">{(ticket.sgst / 100).toFixed(2)}</span>
        </div>
      )}
      {ticket.igst > 0 && (
        <div className="row">
          <span>
            {t('tax.igst')} @{ticket.taxSnapshot.gstRate.toFixed(1)}%
          </span>
          <span className="amt">{(ticket.igst / 100).toFixed(2)}</span>
        </div>
      )}
      {ticket.roundOff !== 0 && (
        <div className="row">
          <span>{t('print.roundOff')}</span>
          <span className="amt">{(ticket.roundOff / 100).toFixed(2)}</span>
        </div>
      )}
      <div className="row total-row">
        <span>{t('print.total')}</span>
        <span className="amt">{formatCurrency(ticket.totalAmount)}</span>
      </div>
      <div className="row">
        <span>{t('print.personsLine', { count: ticket.totalPersons })}</span>
        <span>
          (A:{ticket.adults}, C:{ticket.children})
        </span>
      </div>
      <div className="row">
        <span>{t('print.paidBy')}</span>
        <span>
          {t(PAYMENT_MODE_LABEL_KEYS[ticket.paymentMode])}
          {ticket.payment.razorpayPaymentId ? ` (${ticket.payment.razorpayPaymentId})` : ''}
        </span>
      </div>

      <div className="divider" />

      <div className="center">
        <QRCodeSVG value={ticket.ticketNo} size={100} className="qr" />
      </div>

      <div className="footer">
        <div>{t('print.validSingleEntry')}</div>
        <div>{general.footerText || t('print.nonRefundable')}</div>
        <div>{t('print.thankYou')}</div>
      </div>
    </div>
  );
}
