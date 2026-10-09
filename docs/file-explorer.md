# Live File Explorer

The file explorer is available at `/file-explorer` inside the existing React application. It follows the repository's React + Vite, Tailwind CSS v4, shadcn/ui configuration and existing NestJS module conventions.

## Setup

Install the newly added runtime dependencies and refresh the npm lockfile:

```bash
npm install
```

Configure `FILE_EXPLORER_ROOT` to an absolute path to the local directory the server should watch. If omitted, the server creates and watches `./uploads`. Configure `FRONTEND_ORIGIN` if the frontend origin differs from `http://localhost:5173`. The frontend API origin defaults to `http://localhost:5151`; set `VITE_API_URL` to override it.

Start the existing application with `npm run dev`. The initial tree is available at `GET /api/file-explorer/tree`. Socket.IO emits `filesystem:initial` to each new client and broadcasts `filesystem:event` messages containing `event`, relative `path`, and (for additions/changes) a metadata `node`.

## Backend structure

- `FileExplorerService`: safely reads a recursive tree, normalizes paths to slash-separated relative paths, skips symbolic links, and watches add/unlink/change/addDir/unlinkDir events with chokidar.
- `FileExplorerGateway`: sends an initial snapshot to newly connected Socket.IO clients and broadcasts incremental events.
- `FileExplorerController`: exposes the initial tree over HTTP.
- `FileExplorerModule`: registers the controller, watcher service, and gateway.

## Frontend structure and state

`FileExplorerPage` composes `Sidebar`, `Breadcrumbs`, `FileGlyph`, and `FileCard`. React state holds the tree, active relative path, query, display mode, connection status, and live-event activity. The event reducer immutably removes deleted paths and upserts changed/new nodes; directory navigation and search derive the visible entries from the same tree, so filesystem updates do not require a page reload.

## Security notes

This feature is a read-only browser for a server-configured directory. Keep the root restricted to a dedicated directory, do not allow clients to choose arbitrary server paths, and add authentication/origin restrictions appropriate to your deployment before exposing it beyond a trusted local network. The server intentionally does not follow symbolic links.
