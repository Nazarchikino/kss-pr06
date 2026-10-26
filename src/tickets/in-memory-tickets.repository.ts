import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Ticket } from './ticket.model.js';
import { TicketsRepository } from './tickets.repository.js';
import { TICKETS_SEED } from './tickets.seed.js';

@Injectable()
export class InMemoryTicketsRepository
  extends TicketsRepository
  implements OnModuleInit
{
  private readonly logger = new Logger(InMemoryTicketsRepository.name);
  private items: Ticket[] = [];
  private nextId = 1;

  /** Хук життєвого циклу: викликається після створення модуля, до початку обробки запитів. */
  onModuleInit(): void {
    this.items = TICKETS_SEED.map((t) => ({ ...t, tags: [...t.tags] }));
    this.nextId = Math.max(0, ...this.items.map((t) => t.id)) + 1;
    this.logger.log(`Завантажено заявок: ${this.items.length}`);
  }

  async findAll(
    filter: Partial<Pick<Ticket, 'status' | 'authorId'>> = {},
  ): Promise<Ticket[]> {
    return this.items
      .filter(
        (t) =>
          (filter.status === undefined || t.status === filter.status) &&
          (filter.authorId === undefined || t.authorId === filter.authorId),
      )
      .map((t) => ({ ...t, tags: [...t.tags] }));
  }

  async findById(id: number): Promise<Ticket | undefined> {
    const found = this.items.find((t) => t.id === id);
    return found ? { ...found, tags: [...found.tags] } : undefined;
  }

  async create(data: Omit<Ticket, 'id'>): Promise<Ticket> {
    const ticket: Ticket = { ...data, id: this.nextId++ };
    this.items.push(ticket);
    return { ...ticket, tags: [...ticket.tags] };
  }

  async remove(id: number): Promise<boolean> {
    const before = this.items.length;
    this.items = this.items.filter((t) => t.id !== id);
    return this.items.length < before;
  }
}
