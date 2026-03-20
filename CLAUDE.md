# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ResumeBot is an interactive resume chatbot — recruiters ask natural language questions and get streaming answers about Aaron Edwards' background, powered by Google Gemini 2.5 Flash. The model is grounded by `resume.md` (injected as a system prompt) and stays on-topic.

## Commands

All commands run from the monorepo root via Turborepo.

```sh
pnpm dev          # Start frontend (localhost:5173) and backend (localhost:3001) concurrently
pnpm test         # Run all tests once
pnpm test:watch   # Watch mode (better to run from apps/web or apps/api directly)
pnpm build        # Build all packages
pnpm lint         # Lint all packages (Biome)
pnpm check-types  # Type-check all packages
pnpm format       # Format all files with Biome
```

Run a single test file:
```sh
pnpm --filter web vitest run src/__tests__/useChat.test.tsx
pnpm --filter api vitest run src/routes/__tests__/chat.test.ts
```

## Architecture

**Monorepo:** Turborepo + pnpm workspaces. Build tasks cascade through `^build` dependencies.

```
apps/web     React 19 + Vite frontend, deployed to Firebase Hosting
apps/api     Fastify v5 backend, deployed to GCP Cloud Run
packages/
  types/           Shared ChatMessage, ChatRequest TypeScript types (consumed by both apps)
  ui/              Shadcn-style components (Button, Textarea, AlertDialog) — Radix UI + Tailwind v4
  typescript-config/  Shared tsconfig base
```

**Request flow:**
1. Frontend calls `GET /session` on load → gets session cookie (HttpOnly) + conversation history from Firestore
2. User sends a message → `POST /chat` returns an SSE stream
3. API loads history from Firestore, appends new message, sends last 50 messages + `resume.md` system prompt to Gemini streaming API
4. Each chunk forwarded as `data: {"text":"..."}`, ending with `data: [DONE]`
5. On stream completion, full conversation saved back to Firestore
6. Frontend renders markdown in real time via TanStack Query cache as single source of truth

**Session management:** `session-id` stored as HttpOnly cookie (1-year max-age). Firestore is the primary store; in-memory store is the fallback for local dev without Firebase credentials. Sessions store message history and an optional `userName` (extracted from the first user message via a lightweight Gemini call).

**Streaming:** The `streamChatResponse()` function in `apps/web/src/lib/api.ts` is an async generator that parses SSE chunks. The `useChat` hook drives UI state.

## Key Environment Variables

```
GEMINI_API_KEY     Google Gemini API key (required, set in apps/api/.env)
CORS_ORIGIN        Allowed origin for CORS (production: Firebase Hosting URL)
VITE_API_URL       Backend URL for frontend build (set at build time)
SESSION_STORE      Set to "firestore" in production; defaults to in-memory store for local dev
```

## Testing

- **Framework:** Vitest + @testing-library/react
- **Frontend mocking:** MSW (Mock Service Worker) — handlers in `apps/web/src/mocks/`
- **Test environment:** happy-dom (web), node (api)
- Tests are colocated under `__tests__/` directories alongside source files

## Linting & Formatting

Biome handles both linting and formatting (replaces ESLint + Prettier). Config in `biome.json`: 2-space indent, 100-char line width, double quotes, trailing commas (ES5). Run `pnpm lint` to check, `pnpm format` to auto-fix formatting.

## Dev Practices
Before committing make sure to run
- pnpm lint -- --fix
- pnpm check-types
- pnpm test