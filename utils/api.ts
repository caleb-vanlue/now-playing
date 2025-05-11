import { MediaData } from "../types/media";
import {
  fetchPlexData,
  getThumbnailUrl as getPlexThumbnailUrl,
} from "./plexApi";

export async function fetchMediaData(): Promise<MediaData> {
  return fetchPlexData();
}

export function getThumbnailUrl(fileId: string | undefined): string | null {
  return getPlexThumbnailUrl(fileId);
}
