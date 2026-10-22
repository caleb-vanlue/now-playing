import { NextResponse } from "next/server";
import { getPlexConfig } from "../../../../utils/plexConfig";

export async function GET() {
  return NextResponse.json({
    plex: !!getPlexConfig(),
    jellyfin: !!(process.env.JELLYFIN_URL && process.env.JELLYFIN_API_KEY),
  });
}
