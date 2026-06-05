import { NextResponse } from "next/server";

interface LrclibResponse {
  plainLyrics?: string;
  instrumental?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist");
  const title = searchParams.get("title");
  const album = searchParams.get("album");
  const duration = searchParams.get("duration"); // seconds

  if (!artist || !title) {
    return NextResponse.json({ error: "artist and title required" }, { status: 400 });
  }

  const params = new URLSearchParams({ artist_name: artist, track_name: title });
  if (album) params.set("album_name", album);
  if (duration) params.set("duration", duration);

  try {
    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { "Lrclib-Client": "now-playing-dashboard" },
      next: { revalidate: 3600 },
    });

    if (res.status === 404) {
      return NextResponse.json({ lyrics: null });
    }
    if (!res.ok) throw new Error(`lrclib error: ${res.status}`);

    const data: LrclibResponse = await res.json();

    if (data.instrumental) {
      return NextResponse.json({ lyrics: null, instrumental: true });
    }

    return NextResponse.json({ lyrics: data.plainLyrics ?? null });
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return NextResponse.json({ lyrics: null });
  }
}
