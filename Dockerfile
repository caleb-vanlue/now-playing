FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_PLEX_URL
ARG NEXT_PUBLIC_PLEX_TOKEN
ARG NEXT_PUBLIC_FETCH_TIMEOUT
ENV NEXT_PUBLIC_PLEX_URL=${NEXT_PUBLIC_PLEX_URL}
ENV NEXT_PUBLIC_PLEX_TOKEN=${NEXT_PUBLIC_PLEX_TOKEN}
ENV NEXT_PUBLIC_FETCH_TIMEOUT=${NEXT_PUBLIC_FETCH_TIMEOUT:-8000}

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

ENV HOSTNAME=0.0.0.0
ENV PORT=3003

EXPOSE 3003

CMD ["node", "server.js"]