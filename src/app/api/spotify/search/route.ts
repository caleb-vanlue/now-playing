import { NextRequest, NextResponse } from "next/server";
import { serverCache, SPOTIFY_SEARCH_CACHE_TTL } from "../../../../../utils/serverCache";

interface SpotifySearchResponse {
  tracks: {
    items: {
      name: string;
      external_urls: { spotify: string };
      artists: { name: string }[];
    }[];
  };
}

let spotifyToken: string | null = null;
let tokenExpiration: Date | null = null;

async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && tokenExpiration && new Date() < tokenExpiration) {
    return spotifyToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured on server");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Spotify token error: ${response.status}`);
    }

    const data: { access_token: string; expires_in: number } =
      await response.json();

    spotifyToken = data.access_token;
    tokenExpiration = new Date(Date.now() + (data.expires_in - 60) * 1000);

    return spotifyToken!;
  } catch (error) {
    console.error("Error getting Spotify token:", error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const artist = searchParams.get("artist");
  const title = searchParams.get("title");

  if (!artist || !title) {
    return NextResponse.json(
      { error: "Artist and title parameters are required" },
      { status: 400 }
    );
  }

  const cacheKey = `spotify:search:${artist.toLowerCase()}:${title.toLowerCase()}`;
  const cached = serverCache.get<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const token = await getSpotifyToken();

    const query = encodeURIComponent(`artist:"${artist}" track:"${title}"`);

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify search error: ${response.status}`);
    }

    const data: SpotifySearchResponse = await response.json();
    const tracks = data.tracks.items;

    if (tracks.length > 0) {
      const result = {
        found: true,
        spotifyUrl: tracks[0].external_urls.spotify,
        trackName: tracks[0].name,
        artistName: tracks[0].artists[0].name,
      };
      serverCache.set(cacheKey, result, SPOTIFY_SEARCH_CACHE_TTL);
      return NextResponse.json(result);
    } else {
      const result = { found: false };
      serverCache.set(cacheKey, result, SPOTIFY_SEARCH_CACHE_TTL);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Error searching Spotify:", error);
    return NextResponse.json(
      { error: "Failed to search Spotify" },
      { status: 500 }
    );
  }
}
