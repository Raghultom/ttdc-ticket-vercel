import { useTranslation } from 'react-i18next';
import type { ShiftClose } from '../../types/models';
import { formatCurrency, formatDateTime } from '../../utils/format';
import './print.css';

interface ShiftReportPrintProps {
  shift: ShiftClose;
  fairName: string;
}

export default function ShiftReportPrint({ shift, fairName }: ShiftReportPrintProps) {
  const { t } = useTranslation();

  return (
    <div className="ticket-print paper-80mm">
      <div className="center">
        <strong>{fairName}</strong>
        <div>{t('print.shiftSummaryTitle')}</div>
      </div>
      <div className="divider" />
      <div className="row">
        <span>{t('print.counter')}</span>
        <span>{shift.counterCode}</span>
      </div>
      <div className="row">
        <span>{t('print.operator')}</span>
        <span>{shift.userName}</span>
      </div>
      <div className="row">
        <span>{t('print.date')}</span>
        <span>{shift.date}</span>
      </div>
      <div className="row">
        <span>{t('print.closedAt')}</span>
        <span>{formatDateTime(shift.closedAt)}</span>
      </div>
      <div className="divider" />
      <div className="row">
        <span>{t('dashboard.tickets')}</span>
        <span>{shift.ticketCount}</span>
      </div>
      <div className="row">
        <span>{t('shiftClose.persons')}</span>
        <span>{shift.persons}</span>
      </div>
      <div className="row">
        <span>{t('print.systemCash')}</span>
        <span className="amt">{formatCurrency(shift.systemCash)}</span>
      </div>
      <div className="row">
        <span>{t('print.systemUpi')}</span>
        <span className="amt">{formatCurrency(shift.systemUpi)}</span>
      </div>
      <div className="row">
        <span>{t('print.declaredCash')}</span>
        <span className="amt">{formatCurrency(shift.declaredCash)}</span>
      </div>
      <div className="divider" />
      <div className="row total-row">
        <span>{shift.difference >= 0 ? t('print.excess') : t('print.short')}</span>
        <span className="amt">{formatCurrency(Math.abs(shift.difference))}</span>
      </div>
      <div className="footer">
        <div>{t('print.thankYou')}</div>
      </div>
    </div>
  );
}
