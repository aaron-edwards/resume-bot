FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app .
RUN pnpm --filter api build

FROM base AS deployer
WORKDIR /app
COPY --from=builder /app .
RUN pnpm deploy --filter api --prod /prod/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG GIT_SHA=unknown
ARG BUILD_TIMESTAMP=unknown
ENV GIT_SHA=$GIT_SHA
ENV BUILD_TIMESTAMP=$BUILD_TIMESTAMP
COPY --from=deployer /prod/api ./
COPY --from=builder /app/apps/api/src/data ./dist/data
EXPOSE 3001
CMD ["node", "dist/index.js"]
