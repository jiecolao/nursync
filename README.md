****<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>

## Directory file explorer

The `/directory` page uses a Chokidar filesystem watcher in NestJS and Socket.IO to stream file changes into the React UI. The existing route and `MainLayout` are retained.

### Configuration

Add these values to your local `.env` (do not commit secrets):

```dotenv
# Absolute path is recommended. Defaults to ./storage if omitted.
DIRECTORY_WATCH_PATH=./storage
FRONTEND_ORIGIN=http://localhost:5173
BACKEND_PORT=5151
```

Create the watched directory if needed, install dependencies, then run the existing dev scripts:

```bash
npm install
npm run dev
```

The backend creates the watched directory when it is missing. The Vite client connects to `http://localhost:5151` by default; set `VITE_API_URL` if the API is hosted elsewhere.

### API and realtime protocol

- `GET /api/directory/tree` returns `{ root, tree, generatedAt }`.
- On Socket.IO connection, the server emits `directory:snapshot` with the initial tree.
- `directory:event` streams events with `type` (`add`, `change`, `unlink`, `addDir`, `unlinkDir`), relative `path`, optional `entry`, and `timestamp`.
- `directory:error` reports a snapshot/watcher availability error.

The UI uses a Zustand store to apply events to the affected parent directory, and automatically reconnects the socket. The explorer supports grid/list views, folder navigation, breadcrumbs, local search, size, extension and last-modified metadata.

### Component map

```text
src/modules/directory/
  directory.module.ts
  directory.controller.ts
  directory.gateway.ts
  directory.service.ts
  directory.types.ts
src/hooks/use-directory-live.ts
src/stores/directory-store.ts
src/pages/StudentRecords/DirectoryPage.tsx
```

### Documentation references

- [NestJS WebSocket gateways](https://docs.nestjs.com/websockets/gateways)
- [Chokidar README and API](https://github.com/paulmillr/chokidar)
- [Socket.IO client initialization](https://socket.io/docs/v4/client-initialization/)

**Security note:** the watched path should be a dedicated directory containing only files the signed-in users are authorized to see. Before exposing this endpoint beyond a trusted development environment, protect both the HTTP route and WebSocket gateway with the application's authentication/authorization policy and restrict allowed origins.
