import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { TicketStatus } from './ticket.model.js';
import { type CreateTicketInput, TicketsService } from './tickets.service.js';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  findAll(
    @Query('status') status?: TicketStatus,
    @Query('authorId') authorId?: string,
  ) {
    return this.tickets.findAll({
      status,
      authorId: authorId === undefined ? undefined : Number(authorId),
    });
  }

  @Get(':ticketId')
  findOne(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.tickets.findOne(ticketId);
  }

  @Post()
  create(@Body() body: CreateTicketInput) {
    return this.tickets.create(body);
  }

  @Delete(':ticketId')
  @HttpCode(204)
  remove(@Param('ticketId', ParseIntPipe) ticketId: number) {
    return this.tickets.remove(ticketId);
  }
}
