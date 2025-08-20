# syntax=docker/dockerfile:1.7

# --- Build stage ---
FROM node:22-alpine AS builder
WORKDIR /app
# Copy root manifest and lockfile + web manifest so npm can resolve workspaces
COPY package*.json ./
COPY web/package*.json ./web/
# Quiet npm
ENV NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_LOGLEVEL=error
# Install all workspaces (dev deps included for build) without enforcing lockfile
RUN npm install --workspaces --include=dev
# Copy the rest of the repo
COPY . .
# Build only the web workspace (Next.js standalone output)
RUN npm run --workspace web build

# --- Runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache wget
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Next.js standalone output (monorepo: server file lives under web/)
COPY --from=builder /app/web/.next/standalone ./
# Static assets should be alongside server working dir
COPY --from=builder /app/web/.next/static ./web/.next/static
# Public directory for assets
COPY --from=builder /app/web/public ./web/public

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# In standalone output for workspaces, server.js is at web/server.js
CMD ["node", "web/server.js"]
