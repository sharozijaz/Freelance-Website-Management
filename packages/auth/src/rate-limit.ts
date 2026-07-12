export interface RateLimitContext {
  key: string;
  action: "sign_in" | "password_reset" | "email_verification";
  ipAddress?: string;
}

export interface RateLimitHooks {
  check: (context: RateLimitContext) => Promise<void> | void;
  recordSuccess?: (context: RateLimitContext) => Promise<void> | void;
  recordFailure?: (context: RateLimitContext) => Promise<void> | void;
}

export const noopRateLimitHooks: RateLimitHooks = {
  check: () => undefined,
};
