# Production image for Coolify on Hetzner.
# The build needs no secrets or database: pages read Postgres only at request time.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Small, separate install for the migrate and seed scripts, which run outside Next.
FROM base AS ops
WORKDIR /ops
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund drizzle-orm@0.45.4 postgres@3.4.9

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=ops --chown=app:app /ops/node_modules ./ops/node_modules
COPY --chown=app:app scripts/migrate.mjs scripts/seed.mjs scripts/grant-admin.mjs ./ops/scripts/
COPY --chown=app:app drizzle ./ops/drizzle
COPY --chown=app:app data/seed ./ops/data/seed

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/auth/ok >/dev/null || exit 1

# Apply pending migrations, then start the server.
CMD ["sh", "-c", "node ops/scripts/migrate.mjs && node server.js"]
