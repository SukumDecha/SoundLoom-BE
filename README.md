# SoundLoom Backend

Real-time collaborative music listening rooms powered by WebSockets.

## Status

**Inactive** — Core features completed. Built to learn WebSocket-based real-time synchronization.

## Tech Stack

- **NestJS** — TypeScript backend framework
- **Socket.IO** — Real-time bidirectional communication
- **Redis** — In-memory room state and caching
- **YouTube API** — Music search and discovery

## Engineering Highlights

- **Real-time Sync** — Timestamp-based playback synchronization across multiple clients
- **WebSocket Gateway** — Event-driven architecture handling 20+ room events
- **Stateless Rooms** — Redis-backed ephemeral rooms with auto-cleanup
- **Queue Management** — Shared playlists with shuffle (Fisher-Yates) and loop modes

## Quick Start

```bash
# Development (Docker)
docker-compose -f docker-compose.dev.yml up --build

# Local
pnpm install && pnpm run dev
```

API runs on `:4000` | WebSocket on `:4001`
