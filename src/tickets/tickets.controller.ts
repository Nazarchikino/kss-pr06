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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Page } from '../common/page.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { TicketsQueryDto } from './dto/tickets-query.dto.js';
import type { Ticket } from './ticket.model.js';
import { TicketsService } from './tickets.service.js';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  findAll(@Query() query: TicketsQueryDto): Promise<Page<Ticket>> {
    return this.tickets.findAll(query);
  }

  @Get(':ticketId')
  findOne(@Param('ticketId', ParseIntPipe) ticketId: number): Promise<Ticket> {
    return this.tickets.findOne(ticketId);
  }

  @Post()
  async create(
    @Body() body: CreateTicketDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Ticket> {
    const created = await this.tickets.create(body);
    res.location(`/api/v1/tickets/${created.id}`);
    return created;
  }

  @Delete(':ticketId')
  @HttpCode(204)
  remove(@Param('ticketId', ParseIntPipe) ticketId: number): Promise<void> {
    return this.tickets.remove(ticketId);
  }
}
