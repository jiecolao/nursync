# syntax=docker/dockerfile:1

# Build the NestJS API and Vite client from the same dependency graph.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run build:client

# Minimal Node runtime for the API.
FROM node:24-bookworm-slim AS app
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./prisma.config.ts
RUN mkdir -p /app/storage && chown -R node:node /app/storage
USER node
EXPOSE 5151
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]

# Static frontend image. Nginx proxies /api and Socket.IO to the API service.
FROM nginx:1.28-alpine AS frontend
COPY --from=build /app/dist-client /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
