#
# Multi-stage build for a static webpack output served by nginx.
#

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27-alpine

FROM node:${NODE_VERSION}-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || (npm install && npm ci)

COPY . .

ARG RUN_TESTS=0
RUN if [ "$RUN_TESTS" = "1" ]; then npm test; fi

RUN npm run webpack:prod


FROM nginx:${NGINX_VERSION} AS runtime

ENV NGINX_LISTEN_PORT=8080
ENV RUNTIME_BASE_PATH=

COPY --from=build /app/dist/ /usr/share/nginx/html/

# nginx's official entrypoint will envsubst templates in /etc/nginx/templates to /etc/nginx/conf.d
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template

# runtime-config generation (runs at container start via nginx entrypoint)
COPY docker/entrypoint/99-runtime-config.sh /docker-entrypoint.d/99-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/99-runtime-config.sh && mkdir -p /etc/nginx/conf.d/snippets

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${NGINX_LISTEN_PORT}/healthz" >/dev/null 2>&1 || exit 1


