import type { INestApplication } from '@nestjs/common';

/**
 * Спільні налаштування застосунку. Викликається і в main.ts, і в e2e-тестах,
 * щоб тести перевіряли той самий застосунок, що й працює в продуктивному середовищі.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  return app;
}
