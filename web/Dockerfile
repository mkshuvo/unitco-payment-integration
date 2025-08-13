# syntax=docker/dockerfile:1.7

# --- Build stage ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Use install instead of ci since no lockfile is checked in yet
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./public/.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
