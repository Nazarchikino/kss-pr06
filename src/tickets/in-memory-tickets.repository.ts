import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Comment, Ticket } from './ticket.model.js';
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
  private comments: Comment[] = [];
  private nextCommentId = 1;

  /** Хук життєвого циклу: викликається після створення модуля, до початку обробки запитів. */
  onModuleInit(): void {
    this.items = TICKETS_SEED.map((t) => ({ ...t, tags: [...t.tags] }));
    this.nextId = Math.max(0, ...this.items.map((t) => t.id)) + 1;
    this.comments = [];
    this.nextCommentId = 1;
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
    const ticket: Ticket = {
      ...data,
      id: this.nextId++,
      tags: [...data.tags],
    };
    this.items.push(ticket);
    return { ...ticket, tags: [...ticket.tags] };
  }

  async update(
    id: number,
    patch: Partial<Omit<Ticket, 'id'>>,
  ): Promise<Ticket | undefined> {
    const index = this.items.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    const current = this.items[index]!;
    const updated: Ticket = {
      ...current,
      ...patch,
      id: current.id,
      tags: patch.tags ? [...patch.tags] : [...current.tags],
    };
    this.items[index] = updated;
    return { ...updated, tags: [...updated.tags] };
  }

  async remove(id: number): Promise<boolean> {
    const before = this.items.length;
    this.items = this.items.filter((t) => t.id !== id);
    const removed = this.items.length < before;
    if (removed) {
      this.comments = this.comments.filter((c) => c.ticketId !== id);
    }
    return removed;
  }

  async findComments(ticketId: number): Promise<Comment[]> {
    return this.comments
      .filter((c) => c.ticketId === ticketId)
      .map((c) => ({ ...c }));
  }

  async addComment(data: Omit<Comment, 'id'>): Promise<Comment> {
    const comment: Comment = { ...data, id: this.nextCommentId++ };
    this.comments.push(comment);
    return { ...comment };
  }
}
