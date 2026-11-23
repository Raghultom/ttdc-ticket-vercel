import { useCallback, useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import type { Event, GeneralSettings, PrinterSize, Ticket } from '../../types/models';
import TicketPrint from './TicketPrint';

function pageStyleFor(size: PrinterSize): string {
  switch (size) {
    case '58mm':
      return '@page { size: 58mm auto; margin: 0; } body { margin: 0; }';
    case '80mm':
      return '@page { size: 80mm auto; margin: 0; } body { margin: 0; }';
    case 'A5':
      return '@page { size: A5; margin: 10mm; }';
    case 'A4':
    default:
      return '@page { size: A4; margin: 15mm; }';
  }
}

interface PrintJob {
  ticket: Ticket;
  isDuplicate: boolean;
}

export function useTicketPrinter(events: Event[], general: GeneralSettings, paperSize: PrinterSize) {
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const [job, setJob] = useState<PrintJob | null>(null);

  const reactToPrintFn = useReactToPrint({
    contentRef,
    documentTitle: job?.ticket.ticketNo ?? 'ticket',
    pageStyle: pageStyleFor(paperSize),
    onAfterPrint: () => setJob(null),
  });

  useEffect(() => {
    if (job && pendingRef.current) {
      pendingRef.current = false;
      reactToPrintFn();
    }
  }, [job, reactToPrintFn]);

  const print = useCallback((ticket: Ticket, isDuplicate = false) => {
    pendingRef.current = true;
    setJob({ ticket, isDuplicate });
  }, []);

  const portal = (
    <div style={{ display: 'none' }}>
      <div ref={contentRef}>
        {job && (
          <TicketPrint
            ticket={job.ticket}
            event={events.find((e) => e.id === job.ticket.eventId)}
            general={general}
            paperSize={paperSize}
            isDuplicate={job.isDuplicate}
          />
        )}
      </div>
    </div>
  );

  return { print, portal };
}
