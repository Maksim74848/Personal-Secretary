---
name: AI provider setup
description: The OPENAI_API_KEY secret contains a Groq key (gsk_ prefix). Must use OpenAI SDK with Groq base URL.
---

The user's `OPENAI_API_KEY` secret starts with `gsk_` — this is a **Groq** key, not OpenAI.

**Rule:** Always initialize OpenAI client with:
```ts
new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
```

**Models:** `llama-3.3-70b-versatile` (main), `llama-3.1-8b-instant` (fast/drafts)

**Why:** OpenAI SDK is compatible with Groq's API; using the default OpenAI endpoint with a Groq key returns 401.

**How to apply:** Any new route that needs AI must use `getAI()` from assistant.ts or replicate this pattern.
