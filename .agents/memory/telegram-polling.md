---
name: Telegram polling state
description: Shared polling state lives in telegramState.ts to avoid circular imports between telegram.ts and system.ts.
---

**Rule:** `pollingActive` boolean and `setPollingActive()` live in `artifacts/api-server/src/routes/telegramState.ts`.

Both `telegram.ts` (which runs the poll loop) and `system.ts` (which reads the state for status checks) import from `telegramState.ts`.

**Why:** Putting `pollingActive` in `telegram.ts` and re-exporting it caused issues when `system.ts` imported from `telegram.ts` — the export was a snapshot, not a live reference.

**How to apply:** Any new route that needs to read or write polling state must import from `./telegramState`, never from `./telegram`.
