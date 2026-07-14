import { domainToASCII } from "node:url";
import { isIP } from "node:net";

class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}

export function normalizeHostname(input: string) {
  const raw = input.trim();
  if (!raw) throw new DomainValidationError("Domain is required.");
  if (/[\s\\]/.test(raw)) throw new DomainValidationError("Enter a valid domain name.");

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let hostname: string;
  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new DomainValidationError("Enter an HTTP or HTTPS domain.");
    }
    if (url.username || url.password || url.port || url.search || url.hash) {
      throw new DomainValidationError(
        "Enter a domain name without credentials, ports, query strings, or fragments.",
      );
    }
    hostname = url.hostname;
  } catch (error) {
    if (error instanceof DomainValidationError) throw error;
    throw new DomainValidationError("Enter a valid domain name.");
  }

  const ascii = domainToASCII(hostname.replace(/\.$/, "").toLowerCase());
  if (!ascii || ascii.includes("..") || ascii.startsWith(".") || ascii.endsWith(".")) {
    throw new DomainValidationError("Enter a valid domain name.");
  }
  if (ascii === "localhost" || ascii.includes("_") || ascii.startsWith("*.")) {
    throw new DomainValidationError("Enter a public hostname.");
  }
  if (isIP(ascii) !== 0) {
    throw new DomainValidationError("IP literals are not supported for domain diagnostics.");
  }
  if (!/^(?!-)([a-z0-9-]{1,63}\.)+[a-z0-9-]{2,63}$/.test(ascii)) {
    throw new DomainValidationError("Enter a valid domain name.");
  }

  return ascii;
}
