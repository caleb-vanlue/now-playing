# Now Playing

A sleek, real-time dashboard for monitoring media playback across your self-hosted streaming servers. Supports **Plex** and **Jellyfin** — configure one or both, and sessions and history are merged automatically into a single view.

![Dashboard Screenshot](screenshots/dashboard.png)

## Features

- **Multi-service support**: Works with Plex and Jellyfin simultaneously — sessions and history are pooled and sorted together
- **Live updates**: Playback starts, stops, pauses, and seeks show up within seconds, pushed from your media servers over WebSockets
- **Multi-format support**: Tracks movies, TV shows, and music streams
- **Viewing history**: Browse past watch activity with filtering by user and media type
- **Rich media cards**: Progress, quality, transcode status, cast, genres, ratings, and more — expandable detail view per card
- **Responsive design**: Optimized for mobile and desktop with swipe navigation
- **Light on your servers**: One connection per media server, shared by every open dashboard, and closed when nobody's watching
- **Spotify integration**: Direct links to music tracks on Spotify (requires Premium as of Feb 2026)
- **Animated UI**: Smooth transitions and loading states via Framer Motion
- **Docker deployment**: Simple containerized deployment

## Screenshots

| Movies                                | TV Shows                            | Music                               |
| ------------------------------------- | ----------------------------------- | ----------------------------------- |
| ![Movies](screenshots/movies-web.png) | ![TV Shows](screenshots/tv-web.png) | ![Music](screenshots/music-web.png) |

_Mobile Views_

| Movies                                   | TV Shows                               | Music                                  |
| ---------------------------------------- | -------------------------------------- | -------------------------------------- |
| ![Movies](screenshots/movies-mobile.png) | ![TV Shows](screenshots/tv-mobile.png) | ![Music](screenshots/music-mobile.png) |

| History                             |
| ----------------------------------- |
| ![History](screenshots/history.png) |

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **State Management**: React Context API
- **Gesture Support**: react-swipeable
- **Icons**: react-icons (Simple Icons)
- **Containerization**: Docker
- **APIs**: Plex API, Jellyfin API, Spotify API
- **Live updates**: Plex and Jellyfin WebSockets upstream, Server-Sent Events to the browser

## Prerequisites

- Node.js 22+ (for its built-in WebSocket client)
- Docker and Docker Compose (for containerized deployment)
- A running Plex and/or Jellyfin server
- Spotify Developer credentials (optional, for music integration)

## Setup and Installation

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/caleb-vanlue/now-playing.git
   cd now-playing
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   See [Configuration](#configuration) below for details on each variable.

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Deployment

1. Ensure Docker and Docker Compose are installed.

2. Copy and configure your environment:

   ```bash
   cp .env.example .env
   # edit .env with your values
   ```

3. Build and run:

   ```bash
   docker-compose up -d
   ```

4. Access the dashboard at [http://localhost:3003](http://localhost:3003), then [connect Plex](#connecting-plex).

The compose file mounts `./data` at `/app/data`, where the Plex connection is saved. Keep that mount: without it, every new container starts unclaimed and you'd have to set it up again.

## How Live Updates Work

```
Plex ──────WebSocket──┐                        ┌── SSE ──> browser
                      ├──> session hub ────────┼── SSE ──> browser
Jellyfin ──WebSocket──┘    (in the server)     └── SSE ──> browser
```

The server keeps **one** WebSocket open to each configured media server and pushes session changes to every open dashboard over a single [Server-Sent Events](https://developer.mozilla.org/docs/Web/API/Server-sent_events) stream (`/api/sessions/stream`). Opening more tabs or devices doesn't add load on your media servers.

- **Jellyfin** pushes the full session list whenever playback changes.
- **Plex** sends a short notification for each playback change. The dashboard updates the session in place, and only fetches full details when a new session or item starts. It also re-checks everything every 5 minutes.
- Each WebSocket is seeded with one regular API request when it connects, since neither server sends the current state up front.
- Connections open when the first dashboard does, and close about 2 minutes after the last one does.
- Progress bars count forward in the browser, so routine position reports aren't re-sent unless they disagree by more than 2 seconds.

Everything else (history, artwork, related items, lyrics, Spotify) uses regular HTTP requests.

**Fallbacks.** If a media server's WebSocket drops, the server polls that media server until it reconnects. If the browser can't hold the event stream open, the dashboard polls instead and retries the stream every few minutes. The header shows the current mode:

| Indicator    | Meaning                                                  |
| ------------ | -------------------------------------------------------- |
| Live         | Updates are pushed as they happen                        |
| Connected    | The live stream is unavailable; refreshing periodically  |
| Disconnected | No media server could be reached; retrying automatically |

## Configuration

Copy `.env.example` to `.env`. At least one of Plex or Jellyfin must be connected — both can be active at the same time. Plex is connected by signing in on the instance (below); Jellyfin uses env vars.

### Environment Variables

| Variable                    | Description                                          | Required          |
| --------------------------- | ---------------------------------------------------- | ----------------- |
| `PLEX_URL`                  | Address of your Plex server to try first at sign-in   | Optional          |
| `PLEX_TOKEN`                | Legacy: a Plex token, instead of signing in           | Deprecated        |
| `JELLYFIN_URL`              | Full URL of your Jellyfin server (with port)         | If using Jellyfin |
| `JELLYFIN_API_KEY`          | Jellyfin API key (admin privileges required)         | If using Jellyfin |
| `SPOTIFY_CLIENT_ID`         | Spotify Developer app Client ID                      | Optional          |
| `SPOTIFY_CLIENT_SECRET`     | Spotify Developer app Client Secret                  | Optional          |
| `NEXT_PUBLIC_FETCH_TIMEOUT` | Upstream API request timeout in ms                   | Optional (8000)   |
| `USERNAME_MAP`              | Display-name overrides, e.g. `alice:Alice,bob99:Bob` | Optional          |
| `STATUS_KEY`                | Enables the private `/status` page (see below)       | Optional          |
| `DATA_DIR`                  | Where the Plex connection is saved                    | Optional (`./data`) |
| `RESET_OWNER`               | `true` clears the owner and Plex connection at boot   | Recovery only     |

### Connecting Plex

Plex is connected by signing in on the instance, so no Plex token sits in your environment variables, where a hosting provider could leak it. The instance gets its own token, listed as **Now Playing** under [Authorized Devices](https://app.plex.tv/desktop/#!/settings/devices/all) on plex.tv. If it ever leaks, remove that one device; your other devices stay signed in.

1. Start the instance and find the **setup code** in its logs (`docker logs now-playing`, or your host's log viewer). It looks like `ABCD-EFGH-JKMN`.
2. Open `/setup` and enter the code.
3. Sign in with the Plex account that **owns** the server, then pick the server.
4. The instance tests the server's addresses and saves the first one that works. If it reaches Plex some other way (for example `http://host.docker.internal:32400`), enter that address, or set `PLEX_URL`.

**Why a setup code?** Until someone connects a server, anyone who finds the URL could open `/setup`. The code is printed only to the server logs, so only someone who runs the instance can claim it. It changes on every restart, and after 10 wrong guesses it's replaced with a new one. Once the instance is claimed, `/setup` stops accepting codes.

**Where it's saved.** The connection is stored in `DATA_DIR/instance.json` (default `./data`, `/app/data` in Docker), readable only by the server's user. Put `DATA_DIR` on a persistent volume. On Railway, add a volume to the service mounted at `/app/data`. Without one, each redeploy starts unclaimed and needs the setup steps again.

**Starting over.** Set `RESET_OWNER=true` and restart: the owner and Plex connection are removed and a new setup code is printed. Remove `RESET_OWNER` before the next restart, or it will reset again. Only someone who can change the environment can do this.

**Legacy `PLEX_TOKEN`.** If `PLEX_URL` and `PLEX_TOKEN` are set, they still work, and the server logs a deprecation warning. Sign-in is off while `PLEX_TOKEN` is set.

### Obtaining a Jellyfin API Key

1. Open the Jellyfin admin dashboard
2. Go to **Administration → API Keys → +**
3. Give it a name (e.g. "Now Playing") and save
4. The key needs admin-level access to list all users' playback history

### Status Page

Set `STATUS_KEY` to a long random value (e.g. `openssl rand -hex 32`) to enable `/status`, a private page for the instance. Without the key, `/status` and `/api/status` return 404. The page shows:

- Each media server's connection: live WebSocket, polling, or unreachable, with the last error
- Who is watching the dashboard right now (location, browser, device, IP, live or polling)
- Peak viewers, unique visitors (24 h / 7 d) and connections in the last 24 h
- What's playing, the session hub's state, process memory, and a recent event log

After you enter the key, a signed cookie keeps you signed in for 30 days. Changing `STATUS_KEY` signs everyone out. Scripts can call `/api/status` with `Authorization: Bearer <key>`.

Stats are kept in memory and reset when the server restarts. Location comes from Cloudflare: country works out of the box, and city and region need **Rules → Managed Transforms → Add visitor location headers** turned on in the Cloudflare dashboard. Visitors on your LAN, localhost, or a CGNAT range like Tailscale don't go through Cloudflare, so they show as **Local network**.

### Setting Up Spotify Integration

> **Note:** As of Feb 2026 this feature requires a Spotify Premium account.

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Copy the Client ID and Client Secret into your `.env`

## API Endpoints

| Endpoint                  | Description                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| `/api/sessions/stream`    | Live active sessions from all servers (Server-Sent Events)             |
| `/api/plex/sessions`      | Active Plex sessions (polling fallback)                                |
| `/api/plex/history`       | Plex viewing history                                                   |
| `/api/plex/thumbnail`     | Proxied Plex media thumbnails                                          |
| `/api/jellyfin/sessions`  | Active Jellyfin sessions, enriched with item detail (polling fallback) |
| `/api/jellyfin/history`   | Jellyfin playback history (all users)                                  |
| `/api/jellyfin/thumbnail` | Proxied Jellyfin media thumbnails                                      |
| `/api/spotify/search`     | Spotify track search                                                   |
| `/api/status`             | Instance health and viewer stats (requires `STATUS_KEY`)               |

## Acknowledgments

- [Plex](https://www.plex.tv) for their media server platform
- [Jellyfin](https://jellyfin.org) for the open-source media server
- [Spotify](https://developer.spotify.com) for their music API
- All the open-source libraries that make this possible
