import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

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
    const qualitySettings = {
      low: { quality: 60, width: 200 },
      medium: { quality: 75, width: 400 },
      high: { quality: 85, width: 800 },
      original: { quality: 100, width: null },
    };

    const settings =
      qualitySettings[quality as keyof typeof qualitySettings] ||
      qualitySettings.medium;
    const targetWidth = width ? parseInt(width) : settings.width;

    const imageUrl = `${PLEX_URL}${path}?X-Plex-Token=${PLEX_TOKEN}`;
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Plex API Error: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    let pipeline = sharp(buffer);

    if (targetWidth) {
      pipeline = pipeline.resize(targetWidth, null, {
        withoutEnlargement: true,
        fit: "inside",
      });
    }

    const optimizedBuffer = await pipeline
      .jpeg({ quality: settings.quality, progressive: true })
      .toBuffer();

    return new NextResponse(optimizedBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
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
