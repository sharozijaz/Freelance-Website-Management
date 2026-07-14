export function assertDemoSeedAllowed(env: Record<string, string | undefined>) {
  if (env.SHAROZ_SEED_CONNECTED_DEMO !== "true") {
    throw new Error(
      "Refusing to seed without SHAROZ_SEED_CONNECTED_DEMO=true. This protects real databases from accidental demo data.",
    );
  }
}
