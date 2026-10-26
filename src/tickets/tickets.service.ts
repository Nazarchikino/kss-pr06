import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import { UsersService } from '../users/users.service.js';
import type { Priority, Ticket, TicketStatus } from './ticket.model.js';
import { TicketsRepository } from './tickets.repository.js';

/** Дані для створення заявки (у ПР6 стане класом DTO з валідацією). */
export interface CreateTicketInput {
  title: string;
  description?: string;
  priority: Priority;
  authorId: number;
  tags?: string[];
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly users: UsersService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  findAll(
    filter: { status?: TicketStatus; authorId?: number } = {},
  ): Promise<Ticket[]> {
    return this.repo.findAll(filter);
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException(`Заявку з id=${id} не знайдено`);
    return ticket;
  }

  async create(input: CreateTicketInput): Promise<Ticket> {
    if (!this.users.find(input.authorId)) {
      throw new UnprocessableEntityException(
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
