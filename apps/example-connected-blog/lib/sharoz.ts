import { createSharozClient } from "@sharoz/sdk";

function requiredServerEnv(name: "SHAROZ_API_BASE_URL" | "SHAROZ_PUBLIC_KEY" | "SHAROZ_SECRET") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for the connected Blog example.`);
  }

  return value;
}

export function createServerSharozClient() {
  return createSharozClient({
    baseUrl: requiredServerEnv("SHAROZ_API_BASE_URL"),
    publicKey: requiredServerEnv("SHAROZ_PUBLIC_KEY"),
    secret: requiredServerEnv("SHAROZ_SECRET"),
  });
}
