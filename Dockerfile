FROM node:24.16.0-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY app-api/package.json app-api/
COPY app-web/package.json app-web/
COPY package-shared/package.json package-shared/
COPY package-config/package.json package-config/

RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build -w @flash-sale/shared && npm run build -w @flash-sale/api

FROM node:24.16.0-alpine AS runtime-base

WORKDIR /app

ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-shared/dist ./package-shared/dist
COPY --from=build /app/package-shared/package.json ./package-shared/package.json
COPY --from=build /app/app-api/dist ./app-api/dist
COPY --from=build /app/app-api/package.json ./app-api/package.json

FROM runtime-base AS api
WORKDIR /app/app-api
EXPOSE 3000
CMD ["node", "dist/index.js"]

FROM runtime-base AS worker
WORKDIR /app/app-api
CMD ["node", "dist/worker.js"]

# TODO: nginx static SPA (requires app-web build in build stage)
# FROM nginx:1.27-alpine AS web
# COPY --from=build /app/app-web/dist /usr/share/nginx/html
