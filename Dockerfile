FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_MEDIA_API_URL
ARG NEXT_PUBLIC_FILES_API_URL
ENV NEXT_PUBLIC_MEDIA_API_URL=${NEXT_PUBLIC_MEDIA_API_URL}
ENV NEXT_PUBLIC_FILES_API_URL=${NEXT_PUBLIC_FILES_API_URL}

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

ENV NEXT_PUBLIC_MEDIA_API_URL=${NEXT_PUBLIC_MEDIA_API_URL}
ENV NEXT_PUBLIC_FILES_API_URL=${NEXT_PUBLIC_FILES_API_URL}

EXPOSE 3002

CMD ["node", "server.js"]