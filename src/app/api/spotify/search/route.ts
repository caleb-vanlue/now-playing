import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

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
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      }
    );

    spotifyToken = response.data.access_token;
    tokenExpiration = new Date(
      Date.now() + (response.data.expires_in - 60) * 1000
    );

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

  try {
    const token = await getSpotifyToken();

    const query = encodeURIComponent(`artist:"${artist}" track:"${title}"`);

    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    const tracks = response.data.tracks.items;

    if (tracks.length > 0) {
      return NextResponse.json({
        found: true,
        spotifyUrl: tracks[0].external_urls.spotify,
        trackName: tracks[0].name,
        artistName: tracks[0].artists[0].name,
      });
    } else {
      return NextResponse.json({ found: false });
    }
  } catch (error) {
    console.error("Error searching Spotify:", error);
    return NextResponse.json(
      { error: "Failed to search Spotify" },
      { status: 500 }
    );
  }
}
