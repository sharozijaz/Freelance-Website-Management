export const DEFAULT_SIGN_IN_REDIRECT = "/";

export function getSafeRedirectPath(
  value: string | string[] | null | undefined,
  fallback = DEFAULT_SIGN_IN_REDIRECT,
) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const candidate = rawValue?.trim();

  if (!candidate) {
    return fallback;
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "http://agency.local");

    if (parsed.origin !== "http://agency.local") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
