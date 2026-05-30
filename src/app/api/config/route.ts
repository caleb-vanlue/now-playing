import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    plex: !!(process.env.PLEX_URL && process.env.PLEX_TOKEN),
    jellyfin: !!(process.env.JELLYFIN_URL && process.env.JELLYFIN_API_KEY),
  });
}
