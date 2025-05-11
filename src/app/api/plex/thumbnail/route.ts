import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "Missing thumbnail path" },
      { status: 400 }
    );
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
    let fullUrl = "";
    if (path.startsWith("http")) {
      const separator = path.includes("?") ? "&" : "?";
      fullUrl = `${path}${separator}X-Plex-Token=${PLEX_TOKEN}`;
    } else {
      fullUrl = `${PLEX_URL}${path}?X-Plex-Token=${PLEX_TOKEN}`;
    }

    const response = await fetch(fullUrl);

    if (!response.ok) {
      throw new Error(`Thumbnail error: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
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
