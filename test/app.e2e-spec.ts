// Наскрізні (e2e) тести практичної роботи № 5 (health і users). Файл не змінюйте.
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('helpdesk-api (e2e) – ПР5: health і users', () => {
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

  describe('health', () => {
    it('GET /api/v1/health → 200, стан, назва і версія з package.json', async () => {
      const res = await http.get('/api/v1/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', name: 'helpdesk-api' });
      expect(res.body.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(typeof res.body.uptime).toBe('number');
    });

    it('маршрути доступні лише з префіксом /api/v1', async () => {
      await http.get('/health').expect(404);
    });
  });

  describe('users', () => {
    it('GET /api/v1/users → 3 користувачі', async () => {
      const res = await http.get('/api/v1/users').expect(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0]).toMatchObject({ id: 1, role: 'student' });
    });

    it('GET /api/v1/users/3 → адміністратор', async () => {
      const res = await http.get('/api/v1/users/3').expect(200);
      expect(res.body).toMatchObject({ id: 3, role: 'admin' });
    });

    it('GET /api/v1/users/99 → 404', async () => {
      await http.get('/api/v1/users/99').expect(404);
    });

    it('GET /api/v1/users/abc → 400 (ParseIntPipe)', async () => {
      await http.get('/api/v1/users/abc').expect(400);
    });
  });
});
