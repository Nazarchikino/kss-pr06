import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PageQueryDto, type Page } from '../common/page.js';
import { ChangeStatusDto } from './dto/change-status.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import {
  createTicketSchema,
  type CreateTicketSchemaInput,
} from './dto/create-ticket.schema.js';
import { TicketsQueryDto } from './dto/tickets-query.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import type { Comment, Ticket } from './ticket.model.js';
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
    @Body({ schema: createTicketSchema }) body: CreateTicketSchemaInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Ticket> {
    const created = await this.tickets.create(body);
    res.location(`/api/v1/tickets/${created.id}`);
    return created;
  }

  @Patch(':ticketId')
  update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: UpdateTicketDto,
  ): Promise<Ticket> {
    return this.tickets.update(ticketId, body);
  }

  @Post(':ticketId/status')
  @HttpCode(200)
  changeStatus(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: ChangeStatusDto,
  ): Promise<Ticket> {
    return this.tickets.changeStatus(ticketId, body.status);
  }

  @Delete(':ticketId')
  @HttpCode(204)
  remove(@Param('ticketId', ParseIntPipe) ticketId: number): Promise<void> {
    return this.tickets.remove(ticketId);
  }

  @Get(':ticketId/comments')
  findComments(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Query() query: PageQueryDto,
  ): Promise<Page<Comment>> {
    return this.tickets.findComments(ticketId, query);
  }

  @Get(':ticketId/comments/:commentId')
  findComment(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ): Promise<Comment> {
    return this.tickets.findComment(ticketId, commentId);
  }

  @Post(':ticketId/comments')
  async addComment(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() body: CreateCommentDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Comment> {
    const created = await this.tickets.addComment(ticketId, body);
    res.location(`/api/v1/tickets/${ticketId}/comments/${created.id}`);
    return created;
  }
}
