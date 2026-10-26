import { z } from 'zod';
import { PRIORITIES } from '../ticket.model.js';
import { MAX_ATTACHMENT_SIZE } from './create-ticket.dto.js';

export const attachmentSchema = z
  .object({
    url: z.url({ message: 'url має бути коректною URL-адресою' }),
    size: z.number().int().min(1).max(MAX_ATTACHMENT_SIZE),
  })
  .strict();

export const createTicketSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    description: z.string().max(500).optional(),
    priority: z.enum(PRIORITIES),
    authorId: z.number().int().min(1),
    tags: z.array(z.string()).max(10).optional(),
    attachments: z.array(attachmentSchema).max(5).optional(),
  })
  .strict();

export type CreateTicketSchemaInput = z.infer<typeof createTicketSchema>;
