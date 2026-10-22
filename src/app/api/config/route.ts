import { NextResponse } from "next/server";
import type { ServiceConfig } from "../../../../types/media";
import { getPlexConfig, setupState } from "../../../../utils/plexConfig";

export async function GET() {
  return NextResponse.json<ServiceConfig>({
    plex: !!getPlexConfig(),
    jellyfin: !!(process.env.JELLYFIN_URL && process.env.JELLYFIN_API_KEY),
    setup: setupState(),
  });
}
