import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import { PageQueryDto, paginate, type Page } from '../common/page.js';
import { createFieldErrorException } from '../common/validation.js';
import { UsersService } from '../users/users.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { TicketsQueryDto } from './dto/tickets-query.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { STATUS_TRANSITIONS } from './ticket-status.js';
import type {
  Comment,
  Priority,
  Ticket,
  TicketStatus,
} from './ticket.model.js';
import { TicketsRepository } from './tickets.repository.js';

const PRIORITY_WEIGHT: Readonly<Record<Priority, number>> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly users: UsersService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async findAll(
    query: TicketsQueryDto = new TicketsQueryDto(),
  ): Promise<Page<Ticket>> {
    const all = await this.repo.findAll();
    const needle = query.q?.trim().toLowerCase();

    const filtered = all.filter((t) => {
      if (query.status !== undefined && t.status !== query.status) return false;
      if (query.priority !== undefined && t.priority !== query.priority)
        return false;
      if (query.authorId !== undefined && t.authorId !== query.authorId)
        return false;
      if (query.assigneeId !== undefined && t.assigneeId !== query.assigneeId)
        return false;
      if (needle) {
        const inTitle = t.title.toLowerCase().includes(needle);
        const inDesc = (t.description ?? '').toLowerCase().includes(needle);
        if (!inTitle && !inDesc) return false;
      }
      return true;
    });

    const sort = query.sort ?? '-createdAt';
    const dir = sort.startsWith('-') ? -1 : 1;
    const key = sort.startsWith('-') ? sort.slice(1) : sort;

    filtered.sort((a, b) => {
      const diff =
        key === 'priority'
          ? (PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]) * dir
          : a.createdAt.localeCompare(b.createdAt) * dir;
      return diff !== 0 ? diff : a.id - b.id;
    });

    return paginate(filtered, query.page ?? 1, query.pageSize ?? 10);
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException(`Заявку з id=${id} не знайдено`);
    return ticket;
  }

  async create(input: CreateTicketDto): Promise<Ticket> {
    if (!this.users.find(input.authorId)) {
      throw createFieldErrorException(
        'authorId',
        `Автора з id=${input.authorId} не існує`,
      );
    }
    const now = this.clock.now().toISOString();
    return this.repo.create({
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      status: 'open',
      priority: input.priority,
      authorId: input.authorId,
      assigneeId: null,
      createdAt: now,
      updatedAt: now,
      tags: input.tags ?? [],
    });
  }

  async update(id: number, dto: UpdateTicketDto): Promise<Ticket> {
    const definedEntries = Object.entries(dto).filter(
      ([, value]) => value !== undefined,
    );
    if (definedEntries.length === 0) {
      throw createFieldErrorException(
        'body',
        'Тіло запиту має містити хоча б одне поле для оновлення',
      );
    }

    await this.findOne(id);

    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== null &&
      !this.users.find(dto.assigneeId)
    ) {
      throw createFieldErrorException(
        'assigneeId',
        `Виконавця з id=${dto.assigneeId} не існує`,
      );
    }

    const patch: Partial<Omit<Ticket, 'id'>> = {
      updatedAt: this.clock.now().toISOString(),
    };
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.tags !== undefined) patch.tags = [...dto.tags];
    if (dto.assigneeId !== undefined) patch.assigneeId = dto.assigneeId;

    const updated = await this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(`Заявку з id=${id} не знайдено`);
    return updated;
  }

  async changeStatus(id: number, status: TicketStatus): Promise<Ticket> {
    const ticket = await this.findOne(id);
    const allowed = STATUS_TRANSITIONS[ticket.status];
    if (!allowed.includes(status)) {
      throw new ConflictException({
        message: `Перехід зі стану "${ticket.status}" у "${status}" недопустимий`,
        allowed,
      });
    }
    const updated = await this.repo.update(id, {
      status,
      updatedAt: this.clock.now().toISOString(),
    });
    if (!updated) throw new NotFoundException(`Заявку з id=${id} не знайдено`);
    return updated;
  }

  async remove(id: number): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundException(`Заявку з id=${id} не знайдено`);
  }

  async findComments(
    ticketId: number,
    query: PageQueryDto = new PageQueryDto(),
  ): Promise<Page<Comment>> {
    await this.findOne(ticketId);
    const comments = await this.repo.findComments(ticketId);
    return paginate(comments, query.page ?? 1, query.pageSize ?? 10);
  }

  async findComment(ticketId: number, commentId: number): Promise<Comment> {
    await this.findOne(ticketId);
    const comments = await this.repo.findComments(ticketId);
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) {
      throw new NotFoundException(`Коментар з id=${commentId} не знайдено`);
    }
    return comment;
  }

  async addComment(
    ticketId: number,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    await this.findOne(ticketId);
    if (!this.users.find(dto.authorId)) {
      throw createFieldErrorException(
        'authorId',
        `Автора з id=${dto.authorId} не існує`,
      );
    }
    return this.repo.addComment({
      ticketId,
      authorId: dto.authorId,
      text: dto.text,
      createdAt: this.clock.now().toISOString(),
    });
  }
}
