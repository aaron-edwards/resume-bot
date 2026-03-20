<p align="center">
  <img src="docs/logo.svg" alt="ResumeBot" width="80" />
</p>

<h1 align="center">ResumeBot</h1>

<p align="center">An interactive resume chatbot — ask questions and get answers about my (Aaron Edwards') background, experience, and skills, powered by Google Gemini.</p>

## Overview

ResumeBot is a streaming chat interface primed with my resume. Recruiters and hiring managers can ask natural language questions and receive accurate, grounded answers in real time. The model is instructed to stay on-topic and admit when it doesn't know something.

## Architecture

```mermaid
graph TD
    User["User (Browser)"]
    Web["Frontend\nReact + Vite\nFirebase Hosting"]
    API["Backend\nFastify\nCloud Run"]
    Gemini["Google Gemini API"]
    Resume["resume.md\n(system prompt)"]

    User -->|"types a message"| Web
    Web -->|"POST /chat (full history)"| API
    Resume -->|"injected as system prompt"| API
    API -->|"generateContentStream"| Gemini
    Gemini -->|"streamed chunks"| API
    API -->|"SSE events (data: json)"| Web
    Web -->|"rendered markdown"| User
```

**Request flow:**
1. User types a message and hits send
2. Frontend POSTs the full message history to `POST /chat`
3. Backend injects the resume as a system prompt and calls the Gemini streaming API
4. Each chunk is forwarded to the browser as an SSE event (`data: {"text":"..."}`)
5. Frontend appends each chunk to the assistant message in real time
6. Stream ends with `data: [DONE]`

### Technologies

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Shadcn UI |
| Backend | Fastify v5, Node.js, TypeScript |
| LLM | Google Gemini 2.5 Flash (via `@google/genai`) |
| Streaming | Server-Sent Events (SSE) |
| Monorepo | Turborepo + pnpm workspaces |
| Linting | Biome |
| Testing | Vitest, @testing-library/react |
| Hosting | Firebase Hosting (frontend), GCP Cloud Run (backend) |

### Project structure

```
apps/
  web/        React frontend
  api/        Fastify backend
packages/
  types/              Shared TypeScript types (ChatMessage, ChatRequest)
  typescript-config/  Shared tsconfig
```

## Development

**Prerequisites:** Node.js 22+, pnpm

### Running locally

```sh
# Install dependencies
pnpm install

# Set the Gemini API key
echo "GEMINI_API_KEY=your_key_here" > apps/api/.env

# Start both frontend and backend
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Testing

```sh
pnpm test          # Run all tests once
pnpm test:watch    # Watch mode (run from apps/web or apps/api)
```

Tests are colocated with source files under `__tests__/` directories and cover:

- SSE parsing and streaming (`api.ts`)
- Chat state management and error handling (`useChat`)
- UI components (`MessageBubble`, `Transcript`, `ChatInput`)
- API route validation and streaming (`POST /chat`)
- Gemini client role mapping and chunk filtering (`gemini.ts`)

### Other commands

```sh
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm check-types  # Type-check all apps
```
