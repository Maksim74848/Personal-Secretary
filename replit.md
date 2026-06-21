# ARIA — Персональный ИИ-ассистент

Персональный ИИ-ассистент на русском языке. Управляет расписанием, задачами, контактами, Telegram-сообщениями. Мобильный дизайн, нижняя навигация.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API сервер (порт из $PORT, по умолчанию 8080)
- `pnpm --filter @workspace/assistant run dev` — фронтенд (порт из $PORT)
- `pnpm run typecheck` — полная проверка типов
- `pnpm run build` — сборка всех пакетов
- `pnpm --filter @workspace/api-spec run codegen` — регенерация хуков и Zod-схем из OpenAPI
- `pnpm --filter @workspace/db run push` — применить изменения схемы БД (только dev)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Groq (через OpenAI SDK с baseURL `https://api.groq.com/openai/v1`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (из OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — все таблицы БД
- `artifacts/api-server/src/routes/` — все маршруты API
- `artifacts/assistant/src/pages/` — страницы (dashboard, calendar, tasks, contacts, settings)
- `artifacts/assistant/src/pages/settings.tsx` — настройки (Система, Персонализация, Telegram-inbox, Статус, Telegram, Правила, Память, Логи)
- `artifacts/api-server/src/routes/assistant.ts` — чат с AI + настройки персонализации
- `artifacts/api-server/src/routes/telegram.ts` — Telegram бот + polling
- `artifacts/api-server/src/routes/telegramState.ts` — shared polling state
- `artifacts/api-server/src/routes/system.ts` — `/api/system/status` (AI, DB, Telegram health)

## Architecture decisions

- **Groq key in OPENAI_API_KEY**: ключ начинается с `gsk_`. OpenAI SDK используется с `baseURL: https://api.groq.com/openai/v1`. Модели: `llama-3.3-70b-versatile` (основная), `llama-3.1-8b-instant` (черновики).
- **Telegram polling**: долгий опрос (long polling) запускается при старте сервера через `startPolling()` в `routes/index.ts`. Состояние в `telegramState.ts`.
- **Shared polling state**: `pollingActive` в отдельном файле `telegramState.ts` во избежание цикличных импортов.
- **Персонализация AI**: таблица `user_settings` — тон, объём ответов, эмодзи. Встраивается в системный промпт при каждом запросе.
- **Все маршруты без codegen для новых эндпоинтов**: `/api/system/status`, `/api/assistant/settings`, `/api/telegram/messages` — вызываются прямым `fetch` из фронтенда.

## Product

- **Ассистент**: чат с ARIA (Groq llama-3.3-70b), история диалогов, переключение статуса
- **Календарь**: события, добавление через нижний шит
- **Задачи**: фильтры по статусу, создание и выполнение
- **Контакты**: список, приоритеты, Telegram username, авто-ответы
- **Настройки**:
  - Система — статус AI/DB/Telegram в реальном времени
  - Персонализация — тон (официально/нейтрально/дружески), объём, эмодзи
  - Входящие Telegram — очередь «Требует внимания», ответы прямо из приложения
  - Статус — доступность, контекст, авто-ответное сообщение
  - Telegram — токен бота, настройки авто-ответа
  - Правила, Память, Логи

## User preferences

- Весь UI строго на русском языке
- Мобильный дизайн (mobile-first), нижняя навигация
- Нет демо-данных — всё начинается пустым
- Нет тихих ошибок — если что-то сломалось, пользователь видит понятное объяснение на русском

## Gotchas

- **OPENAI_API_KEY содержит Groq-ключ** (gsk_). Всегда использовать `baseURL: "https://api.groq.com/openai/v1"`.
- Никогда не запускать `pnpm dev` в корне — только через workflow или `pnpm --filter`.
- После изменений схемы БД: `pnpm --filter @workspace/db run push`, затем `pnpm run typecheck:libs`.
- После изменений OpenAPI spec: `pnpm --filter @workspace/api-spec run codegen`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
