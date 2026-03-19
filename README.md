# resume-bot

An interactive resume demo — chat with an LLM that has been primed with my experience and background.

## Stack

- **Frontend** — React + Vite (`apps/web`)
- **Backend** — Fastify + Node.js (`apps/api`)
- **LLM** — Google Gemini (via Gemini API)
- **Monorepo** — Turborepo + pnpm
- **Language** — TypeScript throughout
- **Linting/Formatting** — Biome
- **Testing** — Vitest
- **Hosting** — GCP (Cloud Run + Firebase Hosting)

## Project structure

```
apps/
  web/     React frontend
  api/     Node backend
packages/
  typescript-config/   Shared tsconfig
```

## Getting started

```sh
pnpm install
pnpm dev
```

## Other commands

```sh
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm check-types  # Type-check all apps
pnpm format       # Format all files
```
