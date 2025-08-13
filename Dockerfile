# syntax=docker/dockerfile:1.7

# --- Build stage ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Use install instead of ci to avoid lockfile mismatch during scaffolding
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app

# Install a tiny curl for healthchecks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000

# Copy only necessary files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
  CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
