import { NextRequest, NextResponse } from "next/server";

const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const ALLOWED_IMAGE_TYPES = new Set(["Primary", "Art", "Backdrop", "Banner", "Logo", "Thumb"]);
const ALLOWED_QUALITIES = new Set(["low", "medium", "high"]);
const ALLOWED_TYPES = new Set(["item", "user"]);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const itemId = searchParams.get("itemId");
  const imageType = searchParams.get("imageType") || "Primary";
  const quality = searchParams.get("quality") || "medium";
  const width = searchParams.get("width");
  const type = searchParams.get("type") || "item";

  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  if (!SAFE_ID_RE.test(itemId)) {
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.has(imageType)) {
    return NextResponse.json({ error: "Invalid imageType" }, { status: 400 });
  }

  if (!ALLOWED_QUALITIES.has(quality)) {
    return NextResponse.json({ error: "Invalid quality" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const parsedWidth = width ? parseInt(width, 10) : null;
  if (parsedWidth !== null && (isNaN(parsedWidth) || parsedWidth < 1 || parsedWidth > 3840)) {
    return NextResponse.json({ error: "Invalid width" }, { status: 400 });
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
