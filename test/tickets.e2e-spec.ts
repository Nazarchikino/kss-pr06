// Наскрізні (e2e) тести практичної роботи № 6: CRUD, DTO і валідація. Файл не змінюйте.
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('helpdesk-api (e2e) – ПР6: заявки', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = request(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
  });

  const fields = (res: request.Response) =>
    (res.body.errors ?? []).map((e: { field: string }) => e.field);

  describe('GET /tickets – сторінки, фільтри, сортування', () => {
    it('повертає сторінку { items, page, pageSize, total } зі значеннями за замовчуванням', async () => {
      const res = await http.get('/api/v1/tickets').expect(200);
      expect(res.body).toMatchObject({ page: 1, pageSize: 10, total: 6 });
      expect(res.body.items).toHaveLength(6);
    });

    it('за замовчуванням – від нових до старих (sort=-createdAt)', async () => {
      const res = await http.get('/api/v1/tickets').expect(200);
      expect(res.body.items.map((t: { id: number }) => t.id)).toEqual([
        6, 4, 2, 1, 5, 3,
      ]);
    });

    it('page і pageSize перетворюються з рядків на числа', async () => {
      const res = await http
        .get('/api/v1/tickets?page=2&pageSize=4')
        .expect(200);
      expect(res.body).toMatchObject({ page: 2, pageSize: 4, total: 6 });
      expect(res.body.items).toHaveLength(2);
    });

    it('фільтри status, priority і пошук q', async () => {
      const open = await http
        .get('/api/v1/tickets?status=open&priority=medium')
        .expect(200);
      expect(open.body.items.map((t: { id: number }) => t.id)).toEqual([6]);
      const q = await http.get('/api/v1/tickets?q=HDMI').expect(200);
      expect(q.body.items.map((t: { id: number }) => t.id)).toEqual([1]);
    });

    it('sort=-priority: critical першою', async () => {
      const res = await http.get('/api/v1/tickets?sort=-priority').expect(200);
      expect(res.body.items[0].priority).toBe('critical');
    });

    it('некоректні параметри → 422 з переліком полів', async () => {
      const res = await http
        .get('/api/v1/tickets?page=0&pageSize=100&status=done&sort=title')
        .expect(422);
      expect(fields(res)).toEqual(
        expect.arrayContaining(['page', 'pageSize', 'status', 'sort']),
      );
    });
  });

  describe('POST /tickets – створення і валідація', () => {
    it('201, заголовок Location, пробіли в назві обрізано', async () => {
      const res = await http
        .post('/api/v1/tickets')
        .send({
          title: '  Не працює миша  ',
          priority: 'low',
          authorId: 1,
          tags: ['обладнання'],
        })
        .expect(201);
      expect(res.headers.location).toBe(`/api/v1/tickets/${res.body.id}`);
      expect(res.body).toMatchObject({
        id: 7,
        title: 'Не працює миша',
        status: 'open',
        tags: ['обладнання'],
      });
    });

    it('порожня назва, невідомий пріоритет, відсутній автор → 422', async () => {
      const res = await http
        .post('/api/v1/tickets')
        .send({ title: '   ', priority: 'urgent' })
        .expect(422);
      expect(fields(res)).toEqual(
        expect.arrayContaining(['title', 'priority', 'authorId']),
      );
    });

    it('назва довша за 80 символів → 422', async () => {
      const res = await http
        .post('/api/v1/tickets')
        .send({ title: 'x'.repeat(81), priority: 'low', authorId: 1 })
        .expect(422);
      expect(fields(res)).toEqual(['title']);
    });

    it('зайві поля (id, status) заборонено → 422', async () => {
      const res = await http
        .post('/api/v1/tickets')
        .send({
          id: 99,
          status: 'closed',
          title: 'Миша',
          priority: 'low',
          authorId: 1,
        })
        .expect(422);
      expect(fields(res)).toEqual(expect.arrayContaining(['id', 'status']));
    });

    it('authorId рядком не перетворюється в тілі JSON → 422', async () => {
      await http
        .post('/api/v1/tickets')
        .send({ title: 'Миша', priority: 'low', authorId: '1' })
        .expect(422);
    });

    it('неіснуючий автор → 422 з полем authorId', async () => {
      const res = await http
        .post('/api/v1/tickets')
        .send({ title: 'Миша', priority: 'low', authorId: 42 })
        .expect(422);
      expect(fields(res)).toEqual(['authorId']);
    });
  });

  describe('PATCH /tickets/{ticketId}', () => {
    it('змінює лише передані поля й updatedAt', async () => {
      const before = (await http.get('/api/v1/tickets/4').expect(200)).body;
      const res = await http
        .patch('/api/v1/tickets/4')
        .send({ priority: 'high', assigneeId: 3 })
        .expect(200);
      expect(res.body).toMatchObject({
        id: 4,
        priority: 'high',
        assigneeId: 3,
        title: before.title,
        status: 'open',
      });
      expect(res.body.updatedAt).not.toBe(before.updatedAt);
    });

    it('assigneeId: null знімає виконавця', async () => {
      const res = await http
        .patch('/api/v1/tickets/1')
        .send({ assigneeId: null })
        .expect(200);
      expect(res.body.assigneeId).toBeNull();
    });

    it('стан і автора через PATCH змінити не можна → 422', async () => {
      const res = await http
        .patch('/api/v1/tickets/1')
        .send({ status: 'closed', authorId: 2 })
        .expect(422);
      expect(fields(res)).toEqual(
        expect.arrayContaining(['status', 'authorId']),
      );
    });

    it('порожнє тіло → 422; неіснуюча заявка → 404', async () => {
      await http.patch('/api/v1/tickets/1').send({}).expect(422);
      await http
        .patch('/api/v1/tickets/999')
        .send({ priority: 'low' })
        .expect(404);
    });
  });

  describe('POST /tickets/{ticketId}/status', () => {
    it('open → in_progress → resolved: 200', async () => {
      await http
        .post('/api/v1/tickets/1/status')
        .send({ status: 'in_progress' })
        .expect(200);
      const res = await http
        .post('/api/v1/tickets/1/status')
        .send({ status: 'resolved' })
        .expect(200);
      expect(res.body.status).toBe('resolved');
    });

    it('недопустимий перехід → 409 з переліком допустимих станів', async () => {
      const res = await http
        .post('/api/v1/tickets/1/status')
        .send({ status: 'resolved' })
        .expect(409);
      expect(res.body.allowed).toEqual(['in_progress', 'closed']);
    });

    it('невідомий стан → 422', async () => {
      await http
        .post('/api/v1/tickets/1/status')
        .send({ status: 'done' })
        .expect(422);
    });
  });

  describe('коментарі – вкладена колекція', () => {
    it('POST → 201 + Location; GET колекції і окремого коментаря', async () => {
      const created = await http
        .post('/api/v1/tickets/1/comments')
        .send({ text: ' Замінили кабель ', authorId: 3 })
        .expect(201);
      expect(created.headers.location).toBe(
        `/api/v1/tickets/1/comments/${created.body.id}`,
      );
      expect(created.body).toMatchObject({
        ticketId: 1,
        authorId: 3,
        text: 'Замінили кабель',
      });
      const list = await http.get('/api/v1/tickets/1/comments').expect(200);
      expect(list.body).toMatchObject({ total: 1, page: 1 });
      await http.get(created.headers.location).expect(200);
    });

    it('коментар до неіснуючої заявки → 404; порожній текст → 422', async () => {
      await http
        .post('/api/v1/tickets/999/comments')
        .send({ text: 'x', authorId: 1 })
        .expect(404);
      await http
        .post('/api/v1/tickets/1/comments')
        .send({ text: '', authorId: 1 })
        .expect(422);
    });
  });
});
