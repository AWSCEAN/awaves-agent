# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /repo

# pnpm@9.1.0 — must match "packageManager" in root package.json exactly
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# NEXT_PUBLIC_* vars are replaced with their literal values at build time by
# Next.js. They must be declared as ARGs here so `next build` can inline them
# into the JS bundles. Setting them only in K8s deployment env has no effect
# on the already-built output.
ARG NEXT_PUBLIC_CDN_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

# Copy workspace manifests first — separate layer for caching.
# Install before copying source so dependency layer is cached unless
# package.json / lockfile changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# sharp (transitive dep of @capacitor/assets) needs native compilation tools.
# These are only needed during install and don't affect the final runner image.
RUN apk add --no-cache python3 make g++

RUN pnpm install --frozen-lockfile

# Copy source after install to preserve the cache layer above
COPY apps/web/ ./apps/web/
COPY packages/shared/ ./packages/shared/

WORKDIR /repo/apps/web
RUN pnpm build

# ── Stage 2: Production runner ─────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Non-root user — mirrors apps/api/Dockerfile pattern
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output includes inlined node_modules — no full install needed.
# In a pnpm monorepo, Next.js standalone mirrors the workspace layout:
#   standalone/apps/web/server.js   ← entry point
#   standalone/apps/web/.next/      ← built app
#   standalone/node_modules/        ← hoisted deps
# Static assets and public/ are NOT bundled into standalone — copy them
# to the paths the standalone server.js expects (relative to itself).
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
