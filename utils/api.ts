import { MediaData } from "../types/media";

const MEDIA_API_URL =
  process.env.NEXT_PUBLIC_MEDIA_API_URL || "http://localhost:3000";
const FILES_API_URL =
  process.env.NEXT_PUBLIC_FILES_API_URL || "http://localhost:3001";
const FETCH_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_FETCH_TIMEOUT || "8000");

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function fetchMediaData(): Promise<MediaData> {
  try {
    const response = await fetchWithTimeout(`${MEDIA_API_URL}/media/current`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Error (${response.status}): ${errorText || "Unknown error"}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timed out. The server may be unresponsive.");
      }
      throw error;
    }
    throw new Error("Unknown error occurred while fetching media data");
  }
}

export function getThumbnailUrl(fileId: string | undefined): string | null {
  if (!fileId) return null;
  return `${FILES_API_URL}/files/id/${fileId}`;
}
