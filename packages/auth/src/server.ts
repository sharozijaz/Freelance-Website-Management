import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { and, eq } from "drizzle-orm";
import type { createDatabaseClient } from "@agency/database";
import * as schema from "@agency/database/schema";
import { noopRateLimitHooks, type RateLimitHooks } from "./rate-limit";
import { withActiveOrganization } from "./session";
import type {
  AuditAuthEventPayload,
  AuthSession,
  AuthUser,
  OrganizationMembership,
  SessionContext,
} from "./types";

type Database = ReturnType<typeof createDatabaseClient>;

export interface AuthEmailHooks {
  sendPasswordReset?: (input: {
    email: string;
    name?: string | null;
    token: string;
    url: string;
  }) => Promise<void> | void;
  sendVerificationEmail?: (input: {
    email: string;
    name?: string | null;
    token: string;
    url: string;
  }) => Promise<void> | void;
}

export interface CreateAuthOptions {
  database: Database;
  baseURL: string;
  secret: string;
  trustedOrigins?: string[];
  email?: AuthEmailHooks;
  audit?: (event: AuditAuthEventPayload) => Promise<void> | void;
  rateLimit?: RateLimitHooks;
  useNextCookies?: boolean;
}

export type AgencyAuth = ReturnType<typeof createAuth>;

export function createAuth({
  audit,
  baseURL,
  database,
  email,
  rateLimit = noopRateLimitHooks,
  secret,
  trustedOrigins = [],
  useNextCookies = true,
}: CreateAuthOptions) {
  return betterAuth({
    appName: "Agency Website Platform",
    baseURL,
    trustedOrigins,
    secret,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
      transaction: true,
    }),
    user: {
      modelName: "users",
      fields: {
        image: "avatarUrl",
      },
    },
    session: {
      modelName: "authSessions",
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 30,
    },
    account: {
      modelName: "authAccounts",
    },
    verification: {
      modelName: "authVerifications",
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      sendResetPassword: async ({ token, url, user }) => {
        await rateLimit.check({
          action: "password_reset",
          key: user.email,
        });
        await email?.sendPasswordReset?.({
          email: user.email,
          name: user.name,
          token,
          url,
        });
        await audit?.({
          action: "auth.password_reset_requested",
          actorUserId: user.id,
          metadata: { email: user.email },
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ token, url, user }) => {
        await email?.sendVerificationEmail?.({
          email: user.email,
          name: user.name,
          token,
          url,
        });
        await audit?.({
          action: "auth.email_verification_requested",
          actorUserId: user.id,
          metadata: { email: user.email },
        });
      },
    },
    advanced: {
      cookiePrefix: "agency",
      database: {
        generateId: "uuid",
      },
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    plugins: useNextCookies ? [nextCookies()] : [],
  } satisfies BetterAuthOptions);
}

interface BetterAuthSessionPayload {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    activeOrganizationId?: string | null;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
    image?: string | null | undefined;
    emailVerified?: boolean;
  };
}

interface SessionReadableAuth {
  api: {
    getSession: (input: { headers: Headers }) => Promise<BetterAuthSessionPayload | null>;
  };
}

export async function getSessionContext({
  activeOrganizationId,
  auth,
  database,
  headers,
}: {
  activeOrganizationId?: string | null;
  auth: SessionReadableAuth;
  database: Database;
  headers: Headers;
}): Promise<SessionContext | null> {
  const payload = await auth.api.getSession({ headers });

  if (!payload) {
    return null;
  }

  const memberships = await database.query.memberships.findMany({
    where: and(
      eq(schema.memberships.userId, payload.user.id),
      eq(schema.memberships.status, "active"),
    ),
    columns: {
      organizationId: true,
      permissions: true,
      role: true,
      status: true,
      userId: true,
    },
  });

  const user = {
    email: payload.user.email,
    emailVerified: payload.user.emailVerified ?? false,
    id: payload.user.id,
    image: payload.user.image ?? null,
    name: payload.user.name,
  } satisfies AuthUser;

  const context = {
    memberships: memberships.map((membership): OrganizationMembership => ({
      organizationId: membership.organizationId,
      permissions: membership.permissions,
      role: membership.role,
      status: membership.status,
      userId: membership.userId,
    })),
    session: payload.session satisfies AuthSession,
    user,
  };

  return withActiveOrganization(context, activeOrganizationId);
}
