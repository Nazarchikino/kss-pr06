// Модульні тести TicketsService практичної роботи № 5. Файл не змінюйте.
// Залежності сервісу замінено тестовими: так видно переваги впровадження залежностей.
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CLOCK } from '../common/clock.js';
import { UsersService } from '../users/users.service.js';
import type { Ticket } from './ticket.model.js';
import { TicketsRepository } from './tickets.repository.js';
import { TicketsService } from './tickets.service.js';

describe('TicketsService (модульні тести з підміною залежностей)', () => {
  const fixedNow = new Date('2026-10-01T09:00:00.000Z');
  let service: TicketsService;
  let repo: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(undefined),
      create: vi
        .fn()
        .mockImplementation(async (data: Omit<Ticket, 'id'>) => ({
          id: 100,
          ...data,
        })),
      remove: vi.fn().mockResolvedValue(false),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TicketsRepository, useValue: repo },
        {
          provide: UsersService,
          useValue: {
            find: (id: number) => (id === 1 ? { id: 1 } : undefined),
          },
        },
        { provide: CLOCK, useValue: { now: () => fixedNow } },
      ],
    }).compile();
    service = moduleRef.get(TicketsService);
  });

  it('create: час створення береться з CLOCK, стан – open', async () => {
    const t = await service.create({
      title: 'Миша',
      priority: 'low',
      authorId: 1,
    });
    expect(t).toMatchObject({
      id: 100,
      status: 'open',
      assigneeId: null,
      createdAt: fixedNow.toISOString(),
      updatedAt: fixedNow.toISOString(),
      tags: [],
    });
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('create: неіснуючий автор → UnprocessableEntityException, сховище не викликається', async () => {
    await expect(
      service.create({ title: 'Миша', priority: 'low', authorId: 42 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('findOne: відсутня заявка → NotFoundException', async () => {
    await expect(service.findOne(5)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findById).toHaveBeenCalledWith(5);
  });

  it('remove: відсутня заявка → NotFoundException', async () => {
    await expect(service.remove(5)).rejects.toBeInstanceOf(NotFoundException);
  });
});
