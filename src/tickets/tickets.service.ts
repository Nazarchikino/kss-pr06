import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import { paginate, type Page } from '../common/page.js';
import { createFieldErrorException } from '../common/validation.js';
import { UsersService } from '../users/users.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { TicketsQueryDto } from './dto/tickets-query.dto.js';
import type { Priority, Ticket } from './ticket.model.js';
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

  async remove(id: number): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundException(`Заявку з id=${id} не знайдено`);
  }
}
