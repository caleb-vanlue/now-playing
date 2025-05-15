import { MediaData } from "../types/media";
import {
  fetchPlexData,
  getThumbnailUrl as getPlexThumbnailUrl,
} from "./plexApi";

export async function fetchMediaData(signal?: AbortSignal): Promise<MediaData> {
  return fetchPlexData(signal);
}

export function getThumbnailUrl(fileId: string | undefined): string | null {
  return getPlexThumbnailUrl(fileId);
}
