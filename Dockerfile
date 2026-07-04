# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS base
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
# native modules (better-sqlite3) need build toolchain
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package*.json ./
RUN npm ci

# ---------- builder ----------
FROM base AS builder
RUN apk add --no-cache python3 make g++ libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# runtime libs for better-sqlite3 compiled native
RUN apk add --no-cache libstdc++

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/data ./data

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server.js"]
