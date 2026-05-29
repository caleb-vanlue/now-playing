import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const itemId = searchParams.get("itemId");
  const imageType = searchParams.get("imageType") || "Primary";
  const quality = searchParams.get("quality") || "medium";
  const width = searchParams.get("width");
  const type = searchParams.get("type") || "item"; // "item" or "user"

  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  const JELLYFIN_URL = process.env.JELLYFIN_URL;
  const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY;

  if (!JELLYFIN_URL || !JELLYFIN_API_KEY) {
    return NextResponse.json(
      { error: "Jellyfin configuration missing" },
      { status: 500 }
    );
  }

  const qualitySettings = {
    low: { width: 200, quality: 60 },
    medium: { width: 400, quality: 75 },
    high: { width: 800, quality: 85 },
  };

  const settings =
    qualitySettings[quality as keyof typeof qualitySettings] ||
    qualitySettings.medium;

  const params = new URLSearchParams({
    maxWidth: (width ? parseInt(width) : settings.width).toString(),
    quality: settings.quality.toString(),
    format: "webp",
  });

  const imageUrl =
    type === "user"
      ? `${JELLYFIN_URL}/Users/${itemId}/Images/${imageType}?${params.toString()}`
      : `${JELLYFIN_URL}/Items/${itemId}/Images/${imageType}?${params.toString()}`;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        Authorization: `MediaBrowser Token="${JELLYFIN_API_KEY}", Client="NowPlaying", Device="Server", DeviceId="now-playing-server", Version="1.0"`,
        Accept: "image/webp,image/jpeg,image/*",
      },
    });

    if (!response.ok) {
      throw new Error(`Jellyfin image error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error fetching Jellyfin thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to fetch thumbnail" },
      { status: 500 }
    );
  }
}
