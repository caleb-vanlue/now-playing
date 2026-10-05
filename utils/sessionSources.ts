import type { BaseMedia, SessionsResponse } from "../types/media";
import { applyUsernameMap } from "./usernameMap";
import { serverCache, ITEM_DETAIL_CACHE_TTL } from "./serverCache";
import { fetchWithTimeout, mapPlexSessions, PlexSession } from "./plexApi";
import {
  mapJellyfinSessions,
  EnrichedSession,
  JellyfinItemDetail,
  JellyfinSession,
} from "./jellyfinApi";

export type SessionSource = BaseMedia["source"];

export function configuredSources(): SessionSource[] {
  const sources: SessionSource[] = [];
  if (process.env.PLEX_URL && process.env.PLEX_TOKEN) sources.push("plex");
  if (process.env.JELLYFIN_URL && process.env.JELLYFIN_API_KEY) sources.push("jellyfin");
  return sources;
}

// ── Plex ──────────────────────────────────────────────────────────────────────

export async function fetchPlexSessions(): Promise<SessionsResponse> {
  const PLEX_URL = process.env.PLEX_URL;
  const PLEX_TOKEN = process.env.PLEX_TOKEN;
  if (!PLEX_URL || !PLEX_TOKEN) throw new Error("Plex configuration missing");

  const response = await fetchWithTimeout(
    `${PLEX_URL}/status/sessions?X-Plex-Token=${PLEX_TOKEN}`,
    {
      headers: {
        Accept: "application/json",
        "X-Plex-Client-Identifier": "NowPlaying-Dashboard",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Plex API Error: ${response.status}`);
  }

  const raw = await response.json();
  const sessions: PlexSession[] = raw?.MediaContainer?.Metadata || [];
  sessions.forEach((s) => {
    if (s.User?.title) s.User.title = applyUsernameMap(s.User.title);
  });

  // Build the response field-by-field so nothing unlisted (addresses, file
  // paths, device ids) can reach the client
  return mapPlexSessions(sessions);
}

// ── Jellyfin ──────────────────────────────────────────────────────────────────

export function jellyfinAuthHeader(apiKey: string): string {
  return `MediaBrowser Token="${apiKey}", Client="NowPlaying", Device="Server", DeviceId="now-playing-server", Version="1.0"`;
}

const DETAIL_FIELDS =
  "People,Genres,Studios,Overview,ProductionYear,OfficialRating,CommunityRating,Taglines";

// Item metadata rarely changes, so it's cached per item rather than re-fetched
// with every session refresh. Failures aren't cached so the next refresh retries.
async function fetchItemDetail(
  jellyfinUrl: string,
  apiKey: string,
  userId: string,
  itemId: string,
): Promise<JellyfinItemDetail> {
  const cacheKey = `jellyfin:item:${itemId}`;
  const cached = serverCache.get<JellyfinItemDetail>(cacheKey);
  if (cached) return { ...cached };

  try {
    const res = await fetchWithTimeout(
      `${jellyfinUrl}/Users/${userId}/Items/${itemId}?fields=${DETAIL_FIELDS}`,
      { headers: { Authorization: jellyfinAuthHeader(apiKey) } },
    );
    if (!res.ok) {
      console.warn(`Jellyfin detail fetch failed for item ${itemId}: ${res.status}`);
      return {};
    }
    const full: JellyfinItemDetail = await res.json();
    // Keep only the typed fields; the raw item carries paths and media sources
    const detail: JellyfinItemDetail = {
      People: full.People,
      Genres: full.Genres,
      Studios: full.Studios,
      Overview: full.Overview,
      OfficialRating: full.OfficialRating,
      CommunityRating: full.CommunityRating,
      Taglines: full.Taglines,
      AlbumArtist: full.AlbumArtist,
      ProductionYear: full.ProductionYear,
      BackdropImageTags: full.BackdropImageTags,
    };
    serverCache.set(cacheKey, detail, ITEM_DETAIL_CACHE_TTL);
    return { ...detail };
  } catch (err) {
    console.warn(`Jellyfin detail fetch error for item ${itemId}:`, err);
    return {};
  }
}

type ActiveJellyfinSession = EnrichedSession["session"];

export function activeJellyfinSessions(sessions: JellyfinSession[]): ActiveJellyfinSession[] {
  return sessions.filter(
    (s): s is ActiveJellyfinSession => !!s.IsActive && s.NowPlayingItem != null,
  );
}

/** Adds cached item details (cast, genres, studio) and maps to the shared shape. */
export async function enrichJellyfinSessions(
  sessions: ActiveJellyfinSession[],
): Promise<SessionsResponse> {
  const JELLYFIN_URL = process.env.JELLYFIN_URL;
  const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;
  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) throw new Error("Jellyfin configuration missing");

  const enriched: EnrichedSession[] = await Promise.all(
    sessions.map(async (session) => {
      const item = session.NowPlayingItem;
      const detail = await fetchItemDetail(
        JELLYFIN_URL,
        JELLYFIN_API_KEY,
        session.UserId,
        item.Id,
      );

      if (item.Type === "Episode" && item.SeriesId) {
        const seriesDetail = await fetchItemDetail(
          JELLYFIN_URL,
          JELLYFIN_API_KEY,
          session.UserId,
          item.SeriesId,
        );
        if (seriesDetail.People?.length) {
          detail.People = seriesDetail.People;
        }
      }

      return {
        session: {
          ...session,
          UserName: session.UserName && applyUsernameMap(session.UserName),
        },
        detail,
      };
    }),
  );

  // Build the response field-by-field so nothing unlisted (endpoints, file
  // paths, device ids) can reach the client
  return mapJellyfinSessions(enriched);
}

export async function fetchJellyfinSessions(): Promise<SessionsResponse> {
  const JELLYFIN_URL = process.env.JELLYFIN_URL;
  const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;
  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) throw new Error("Jellyfin configuration missing");

  const res = await fetchWithTimeout(`${JELLYFIN_URL}/Sessions`, {
    headers: {
      Authorization: jellyfinAuthHeader(JELLYFIN_API_KEY),
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Jellyfin API Error: ${res.status}`);
  }

  const sessions: JellyfinSession[] = await res.json();
  return enrichJellyfinSessions(activeJellyfinSessions(sessions));
}

export const SESSION_FETCHERS: Record<SessionSource, () => Promise<SessionsResponse>> = {
  plex: fetchPlexSessions,
  jellyfin: fetchJellyfinSessions,
};
