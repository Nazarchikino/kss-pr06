import { IsIn } from 'class-validator';
import { TICKET_STATUSES, type TicketStatus } from '../ticket.model.js';

export class ChangeStatusDto {
  @IsIn(TICKET_STATUSES, {
    message: `status має бути одним із: ${TICKET_STATUSES.join(', ')}`,
  })
  status: TicketStatus;
}
