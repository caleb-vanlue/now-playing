import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");
  const quality = searchParams.get("quality") || "medium";
  const width = searchParams.get("width");

  if (!path) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  const PLEX_URL = process.env.PLEX_URL;
  const PLEX_TOKEN = process.env.PLEX_TOKEN;

  if (!PLEX_URL || !PLEX_TOKEN) {
    return NextResponse.json(
      { error: "Plex configuration missing" },
      { status: 500 }
    );
  }

  try {
    const plexParams = new URLSearchParams({
      "X-Plex-Token": PLEX_TOKEN,
    });

    const qualitySettings = {
      low: { width: 200, height: 200, quality: 60 },
      medium: { width: 400, height: 400, quality: 75 },
      high: { width: 800, height: 800, quality: 85 },
    };

    const settings =
      qualitySettings[quality as keyof typeof qualitySettings] ||
      qualitySettings.medium;

    if (settings.width) {
      plexParams.append("width", settings.width.toString());
      plexParams.append("height", settings.height.toString());
    }

    if (settings.quality) {
      plexParams.append("quality", settings.quality.toString());
    }

    if (width) {
      plexParams.set("width", width);
      plexParams.set("height", width); // Keep aspect ratio
    }

    plexParams.append("minSize", "1");
    plexParams.append("upscale", "0");

    const imageUrl = `${PLEX_URL}${path}?${plexParams.toString()}`;

    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/webp,image/jpeg,image/*",
      },
    });

    if (!response.ok) {
      throw new Error(`Plex API Error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error fetching thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to fetch thumbnail" },
      { status: 500 }
    );
  }
}
