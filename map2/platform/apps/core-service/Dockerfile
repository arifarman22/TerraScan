# ============================================================
# Core Management Service — multi-stage image
# Build context MUST be the monorepo root (platform/):
#   docker compose builds it with context: ..
# ============================================================

# ---------- builder ----------
FROM node:24-alpine AS builder
WORKDIR /app

# Workspace manifests first — maximises Docker layer caching.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/core-service/package.json ./apps/core-service/
RUN npm ci

# Sources.
COPY packages/shared-types ./packages/shared-types
COPY apps/core-service ./apps/core-service

# Build the shared types package, then the service.
RUN npm run build --workspace @platform/shared-types \
 && npm run build --workspace @platform/core-service

# Strip dev dependencies from node_modules.
RUN npm prune --omit=dev

# ---------- runner ----------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as an unprivileged user.
RUN addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/packages/shared-types ./packages/shared-types
COPY --from=builder --chown=app:app /app/apps/core-service ./apps/core-service

USER app
EXPOSE 3001
CMD ["node", "apps/core-service/dist/main.js"]
