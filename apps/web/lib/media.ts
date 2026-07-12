import { payloadApiUrl } from "./config";
import type { PayloadMedia } from "./payload/types";

export function isMedia(value: PayloadMedia | string | null | undefined): value is PayloadMedia {
  return Boolean(value && typeof value === "object" && "id" in value);
}

export function getMediaUrl(media: PayloadMedia | string | null | undefined): string | null {
  if (!isMedia(media) || !media.url) {
    return null;
  }

  if (media.url.startsWith("http")) {
    return media.url;
  }

  return `${payloadApiUrl}${media.url}`;
}

export function getMediaAlt(media: PayloadMedia | string | null | undefined): string {
  return isMedia(media) ? (media.alt ?? "") : "";
}
