export const payloadApiUrl =
  process.env.PAYLOAD_API_URL?.replace(/\/$/, "") ?? "http://localhost:3002";

export const websiteBaseUrl =
  process.env.NEXT_PUBLIC_WEB_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3003";

export const defaultRevalidateSeconds = 300;

export const previewSecret = process.env.WEBSITE_PREVIEW_SECRET ?? "development-preview-secret";
