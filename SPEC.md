# Вимоги практичної роботи № 6 «CRUD-контролер з DTO та валідацією»

Продовження проєкту практичної роботи № 5. Усі маршрути – з префіксом `/api/v1`.
Перевірка: `npm run check` – 4 модульні і 27 e2e-тестів (`test/app.e2e-spec.ts` – health і users з ПР5,
`test/tickets.e2e-spec.ts` – заявки). Файли тестів не змінюйте.

Залежності: `npm install class-validator class-transformer @nestjs/mapped-types`.

## Глобальна валідація (`src/common/validation.ts`, підключення в `src/app.setup.ts`)

`ValidationPipe` з параметрами `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
Помилка валідації – **422** з тілом `{ message, errors: [{ field, message }] }`
(функція `exceptionFactory`; вкладені помилки розгортаються в поле `батько.дитина`).

## DTO (`src/tickets/dto/`)

| Клас | Поля і правила |
|---|---|
| `CreateTicketDto` | title – рядок 1–80 після обрізання пробілів; description? ≤ 500; priority – low/medium/high/critical; authorId – ціле ≥ 1; tags? – ≤ 10 рядків |
| `UpdateTicketDto` | `PartialType(PickType(CreateTicketDto, [title, description, priority, tags]))` + assigneeId? – ціле ≥ 1 або null |
| `TicketsQueryDto extends PageQueryDto` | status?, priority?, authorId?, assigneeId?, q? ≤ 100, sort ∈ createdAt / -createdAt / priority / -priority (за замовчуванням -createdAt) |
| `PageQueryDto` (`src/common/page.ts`) | page ≥ 1 (1), pageSize 1–50 (10); рядки параметрів перетворюються на числа (`@Type(() => Number)`) |
| `ChangeStatusDto` | status – один зі станів |
| `CreateCommentDto` | text 1–1000 після обрізання; authorId ≥ 1 |

## Маршрути заявок

| Метод і шлях | Успіх | Помилки |
|---|---|---|
| GET /tickets?status&priority&authorId&assigneeId&q&sort&page&pageSize | 200 `{ items, page, pageSize, total }` | 422 |
| GET /tickets/{ticketId} | 200 | 400, 404 |
| POST /tickets | 201 + `Location: /api/v1/tickets/{id}` | 422 (зокрема неіснуючий автор – поле authorId) |
| PATCH /tickets/{ticketId} | 200; оновлює updatedAt | 404; 422 – порожнє тіло, заборонені поля (status, authorId), неіснуючий виконавець |
| POST /tickets/{ticketId}/status | 200 | 404; 409 `{ message, allowed }` – недопустимий перехід; 422 |
| DELETE /tickets/{ticketId} | 204 | 404 |
| GET /tickets/{ticketId}/comments?page&pageSize | 200 – сторінка коментарів | 404 |
| GET /tickets/{ticketId}/comments/{commentId} | 200 | 404 |
| POST /tickets/{ticketId}/comments | 201 + Location | 404, 422 |

Переходи станів: open → in_progress, closed; in_progress → open, resolved; resolved → closed, in_progress; closed → –.
