# NurSync

## Docker deployment

Docker Compose runs the NestJS API, the React/Vite-built frontend served by Nginx, and MariaDB. MariaDB data and the application's watched storage directory use named volumes.

### 1. Configure secrets

Copy the example environment file and replace the example passwords/secrets before running production:

```sh
cp .env.example .env
```

Generate a strong JWT secret, for example with `openssl rand -base64 48`. Set unique values for `JWT_SECRET`, `DB_PASSWORD`, and `DB_ROOT_PASSWORD`. Do not commit `.env`.

### 2. Build and run in production mode

```sh
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f app
```

Open http://localhost:8080. The frontend is served by Nginx; `/api` and Socket.IO traffic are reverse-proxied to the API container. MariaDB is not published to the host in production. Configure `WEB_PORT` if port 8080 is occupied.

To stop the stack without deleting persistent data:

```sh
docker compose down
```

**Do not use `docker compose down -v` unless you intend to delete the database and storage volumes.**

### 3. Local development with hot reload

The development override mounts the source tree into the Node container and runs the existing Nest watch and Vite development scripts. It publishes the Vite and API ports and MariaDB for local tools.

```sh
cp .env.example .env
docker compose -f docker-compose.dev.yml up --build
```

Open http://localhost:5173 for Vite hot reload, and http://localhost:5151 for the API. Stop with Ctrl+C; use `docker compose -f docker-compose.dev.yml down` to stop services while preserving volumes.

### Useful commands

```sh
# Rebuild images after dependency or Dockerfile changes
docker compose build --no-cache

# Tail all production logs
docker compose logs -f

# Restart services
docker compose restart

# Open a MariaDB shell inside the database container
docker compose exec db mariadb -u nursync -p nursync
```

The first database start initializes the named volume using the credentials in `.env`. Changing those environment values later does not change credentials already stored in an initialized MariaDB volume; update the database user separately if rotating credentials.

## Existing project notes

The `/directory` page uses a Chokidar filesystem watcher in NestJS and Socket.IO to stream file changes into the React UI. Set `DIRECTORY_WATCH_PATH` to a dedicated directory containing only files authorized users may access. Protect the HTTP route and WebSocket gateway with the application's authentication/authorization policy before exposing it publicly.

API prefix: `/api`. Default backend port: `5151`.
