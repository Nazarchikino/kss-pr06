import type { TicketStatus } from './ticket.model.js';

export const STATUS_TRANSITIONS: Readonly<
  Record<TicketStatus, readonly TicketStatus[]>
> = {
  open: ['in_progress', 'closed'],
  in_progress: ['open', 'resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};
