## Containers

This repository builds a static `dist/` output with webpack and serves it via nginx.

### Quick start

- **Build**:

```bash
docker build -t kotor-js .
```

- **Run**:

```bash
docker run --rm -p 8080:8080 kotor-js
```

- **Open**: `http://127.0.0.1:8080/`

### Configuration

The image is a static nginx server. Configuration is done through environment variables at runtime.

- **`NGINX_LISTEN_PORT`**: Port nginx listens on inside the container (must be >1024 on most systems). Default: `8080`.
- **`RUNTIME_BASE_PATH`**: Public path prefix to be written into `runtime-config.js`.
  - Examples: empty/omitted for root, or `/kotor` for a prefix.
  - When set, nginx will also accept requests *with* that prefix (it rewrites `${RUNTIME_BASE_PATH}/...` to `/...` internally). This means a reverse proxy can either strip the prefix or leave it intact.

#### Examples

- **Change listen port inside container**:

```bash
docker run --rm -e NGINX_LISTEN_PORT=9090 -p 9090:9090 kotor-js
```

- **Serve under a path prefix** (reverse proxy must route that prefix to the container):

```bash
docker run --rm -e RUNTIME_BASE_PATH=/kotor -p 8080:8080 kotor-js
```

### URL layout

The container serves:

- `/` → redirects to `/launcher/`
- `/launcher/`
- `/game/`
- `/forge/`
- `/debugger/`

Each app path has an SPA fallback to its own `index.html`.

### Reverse proxies

This container is compatible with common reverse proxies because it:

- listens on a configurable port,
- serves plain HTTP,
- supports SPA fallbacks under the app paths,
- provides a health endpoint at `/healthz`.

#### Traefik (example)

Route a host to the container and (optionally) a path prefix. If using a path prefix, you typically either:

- route the prefix without stripping it (supported), or
- strip the prefix before proxying (also supported).

**Example 1: Host routing (root path)**

```yaml
services:
  app:
    image: kotor-js:latest
    environment:
      NGINX_LISTEN_PORT: "8080"
      RUNTIME_BASE_PATH: ""
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.kotor.rule=Host(`play.example.com`)"
      - "traefik.http.routers.kotor.entrypoints=websecure"
      - "traefik.http.services.kotor.loadbalancer.server.port=8080"
```

**Example 2: Path prefix routing (Traefik strips prefix)**

```yaml
services:
  app:
    image: kotor-js:latest
    environment:
      NGINX_LISTEN_PORT: "8080"
      RUNTIME_BASE_PATH: "/kotor"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.kotor.rule=Host(`example.com`) && PathPrefix(`/kotor`)"
      - "traefik.http.routers.kotor.entrypoints=websecure"
      - "traefik.http.middlewares.kotor-stripprefix.stripprefix.prefixes=/kotor"
      - "traefik.http.routers.kotor.middlewares=kotor-stripprefix"
      - "traefik.http.services.kotor.loadbalancer.server.port=8080"
```

**Example 3: Path prefix routing (Traefik does NOT strip prefix)**

```yaml
services:
  app:
    image: kotor-js:latest
    environment:
      NGINX_LISTEN_PORT: "8080"
      RUNTIME_BASE_PATH: "/kotor"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.kotor.rule=Host(`example.com`) && PathPrefix(`/kotor`)"
      - "traefik.http.routers.kotor.entrypoints=websecure"
      - "traefik.http.services.kotor.loadbalancer.server.port=8080"
```

#### Nginx (standalone reverse proxy)

**Example 1: Root path**

```nginx
upstream kotor_backend {
  server 127.0.0.1:8080;
}

server {
  listen 443 ssl http2;
  server_name play.example.com;

  # SSL config omitted for brevity

  location / {
    proxy_pass http://kotor_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Example 2: Path prefix (strip before forwarding)**

```nginx
upstream kotor_backend {
  server 127.0.0.1:8080;
}

server {
  listen 443 ssl http2;
  server_name example.com;

  # SSL config omitted for brevity

  location /kotor/ {
    rewrite ^/kotor/(.*)$ /$1 break;
    proxy_pass http://kotor_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Example 3: Path prefix (forward with prefix intact)**

```nginx
upstream kotor_backend {
  server 127.0.0.1:8080;
}

server {
  listen 443 ssl http2;
  server_name example.com;

  # SSL config omitted for brevity

  location /kotor/ {
    proxy_pass http://kotor_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

In all examples, ensure your container is started with the appropriate `RUNTIME_BASE_PATH` value matching your routing strategy.

### Smoke testing

After building and running the container, verify the key routes:

```bash
# Build the image
docker build -t kotor-js:test .

# Run the container in the background
docker run --rm -d --name kotor-test -p 8080:8080 kotor-js:test

# Wait for it to start
sleep 5

# Test health endpoint
curl -f http://127.0.0.1:8080/healthz || echo "FAIL: healthz"

# Test root redirect
curl -sI http://127.0.0.1:8080/ | grep -q "302.*launcher" || echo "FAIL: root redirect"

# Test each app entry
for path in launcher game forge debugger; do
  curl -sf http://127.0.0.1:8080/$path/ | grep -q "<!DOCTYPE" || echo "FAIL: /$path/"
done

# Stop the container
docker stop kotor-test
```

**Test with path prefix:**

```bash
docker run --rm -d --name kotor-test-prefix \
  -e RUNTIME_BASE_PATH=/kotor \
  -p 8081:8080 kotor-js:test

sleep 5

# Test with prefix
curl -f http://127.0.0.1:8081/kotor/healthz || echo "FAIL: /kotor/healthz"
curl -sf http://127.0.0.1:8081/kotor/launcher/ | grep -q "<!DOCTYPE" || echo "FAIL: /kotor/launcher/"

docker stop kotor-test-prefix
```

### Multi-arch builds

The `Dockerfile` is multi-stage and works with `docker buildx` for `linux/amd64` and `linux/arm64`:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t your-org/kotor-js:latest --push .
```
