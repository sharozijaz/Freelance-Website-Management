import { z } from "zod";

export const bootstrapOwnerInputSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(120),
  organizationName: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(128),
});

export type BootstrapOwnerInput = z.infer<typeof bootstrapOwnerInputSchema>;

export class BootstrapAlreadyCompletedError extends Error {
  constructor() {
    super("Agency owner bootstrap has already been completed.");
    this.name = "BootstrapAlreadyCompletedError";
  }
}

export function assertBootstrapAllowed(activeAgencyOwnerCount: number) {
  if (activeAgencyOwnerCount > 0) {
    throw new BootstrapAlreadyCompletedError();
  }
}

export function createOrganizationSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "agency-platform";
}
