import { NextResponse } from "next/server";
import { serverCache } from "../../../../utils/serverCache";

const LYRICS_CACHE_TTL = 24 * 60 * 60 * 1000;

interface LrclibResponse {
  plainLyrics?: string;
  instrumental?: boolean;
}

interface LyricsResult {
  lyrics: string | null;
  instrumental?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist");
  const title = searchParams.get("title");
  const album = searchParams.get("album");
  const duration = searchParams.get("duration"); // seconds

  if (!artist || !title) {
    return NextResponse.json(
      { error: "artist and title required" },
      { status: 400 },
    );
  }

  const cacheKey = `lyrics:${artist.toLowerCase()}:${title.toLowerCase()}:${(album ?? "").toLowerCase()}:${duration ?? ""}`;
  const cached = serverCache.get<LyricsResult>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });
  if (album) params.set("album_name", album);
  if (duration) params.set("duration", duration);

  try {
    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { "Lrclib-Client": "now-playing-dashboard" },
    });

    if (res.status === 404) {
      const result: LyricsResult = { lyrics: null };
      serverCache.set(cacheKey, result, LYRICS_CACHE_TTL);
      return NextResponse.json(result);
    }
    if (!res.ok) throw new Error(`lrclib error: ${res.status}`);

    const data: LrclibResponse = await res.json();

    const result: LyricsResult = data.instrumental
      ? { lyrics: null, instrumental: true }
      : { lyrics: data.plainLyrics ?? null };

    serverCache.set(cacheKey, result, LYRICS_CACHE_TTL);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return NextResponse.json({ lyrics: null });
  }
}
