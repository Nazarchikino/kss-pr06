export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export const TICKET_STATUSES: readonly TicketStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];
export const PRIORITIES: readonly Priority[] = [
  'low',
  'medium',
  'high',
  'critical',
];

export interface Attachment {
  url: string;
  size: number;
}

export interface Ticket {
  readonly id: number;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: Priority;
  authorId: number;
  assigneeId: number | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  attachments?: Attachment[];
}

export interface Comment {
  readonly id: number;
  ticketId: number;
  authorId: number;
  text: string;
  createdAt: string;
}
