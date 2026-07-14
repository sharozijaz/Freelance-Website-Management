import { logger } from "./observability/logger";

const safeErrorMessages = [
  "Authentication is required.",
  "An active organization is required.",
  "Permission denied.",
  "Client organization is required.",
  "Website is required.",
  "Website type is required.",
  "Website type is not supported.",
  "Unknown website module.",
  "Module action is not supported.",
  "Orders requires Catalog and Customers.",
  "Business modules can only be enabled for Sharoz Connected websites in this milestone.",
  "Blog is only available for Sharoz Connected websites.",
  "Blog module is not enabled for this website.",
  "Blog slug is required.",
  "Blog post title must be at least 2 characters.",
  "A Blog post with this slug already exists for this website.",
  "Blog post was not found.",
  "Blog category name is required.",
  "A Blog category with this slug already exists for this website.",
  "Blog category was not found.",
  "Assigned Blog categories cannot be deleted.",
  "Blog tag name is required.",
  "A Blog tag with this slug already exists for this website.",
  "Blog tag was not found.",
  "Assigned Blog tags cannot be deleted.",
  "Blog action is not supported.",
  "Featured media must belong to this website or organization.",
  "Blog categories must belong to this website.",
  "Blog tags must belong to this website.",
  "Canonical URL must use HTTPS.",
  "Canonical URL must be a valid URL.",
  "Missing organization id.",
  "Invalid invitation token.",
  "Invitation has expired.",
];

export function toSafeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (safeErrorMessages.includes(error.message)) {
    return error.message;
  }

  logger.error("dashboard.safe_error.unexpected", { error });
  return fallback;
}
