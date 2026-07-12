import "dotenv/config";
import { and, count, eq, isNull } from "drizzle-orm";
import { createDatabaseClient } from "@agency/database";
import * as schema from "@agency/database/schema";
import {
  assertBootstrapAllowed,
  bootstrapOwnerInputSchema,
  createOrganizationSlug,
} from "@agency/auth/bootstrap";
import { createAuth } from "@agency/auth/server";

function readEnvironment() {
  return bootstrapOwnerInputSchema.parse({
    email: process.env.OWNER_EMAIL,
    name: process.env.OWNER_NAME ?? "Agency Owner",
    organizationName: process.env.OWNER_ORGANIZATION_NAME ?? "Agency Platform",
    password: process.env.OWNER_PASSWORD,
  });
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function main() {
  const input = readEnvironment();
  const database = createDatabaseClient({
    connectionString: getRequiredEnv("DATABASE_URL"),
    maxConnections: 1,
  });
  const auth = createAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    database,
    secret: getRequiredEnv("BETTER_AUTH_SECRET"),
    trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    useNextCookies: false,
  });

  const [ownerCount] = await database
    .select({ count: count() })
    .from(schema.memberships)
    .where(
      and(
        eq(schema.memberships.role, "agency_owner"),
        eq(schema.memberships.status, "active"),
        isNull(schema.memberships.deletedAt),
      ),
    );

  assertBootstrapAllowed(ownerCount?.count ?? 0);

  const existingUser = await database.query.users.findFirst({
    where: eq(schema.users.email, input.email),
  });

  if (existingUser) {
    throw new Error("A user with OWNER_EMAIL already exists. Refusing to reuse an existing identity.");
  }

  const baseSlug = createOrganizationSlug(input.organizationName);
  const existingOrganization = await database.query.organizations.findFirst({
    where: eq(schema.organizations.slug, baseSlug),
  });
  const organizationSlug = existingOrganization ? `${baseSlug}-bootstrap` : baseSlug;

  await auth.api.signUpEmail({
    body: {
      email: input.email,
      name: input.name,
      password: input.password,
    },
  });

  const createdUser = await database.query.users.findFirst({
    where: eq(schema.users.email, input.email),
  });

  if (!createdUser) {
    throw new Error("Owner user was not created by the authentication provider.");
  }

  const now = new Date();

  const [organization] = await database
    .insert(schema.organizations)
    .values({
      name: input.organizationName,
      slug: organizationSlug,
      status: "active",
    })
    .returning();

  if (!organization) {
    throw new Error("Owner organization was not created.");
  }

  await database
    .update(schema.users)
    .set({
      emailVerified: true,
      name: input.name,
      status: "active",
      updatedAt: now,
    })
    .where(eq(schema.users.id, createdUser.id));

  await database.insert(schema.memberships).values({
    acceptedAt: now,
    organizationId: organization.id,
    permissions: [],
    role: "agency_owner",
    status: "active",
    userId: createdUser.id,
  });

  await database.insert(schema.auditLogs).values({
    action: "auth.owner_bootstrapped",
    actorUserId: createdUser.id,
    metadata: { email: input.email },
    organizationId: organization.id,
    resourceId: createdUser.id,
    resourceType: "user",
  });

  console.log("Agency owner bootstrap completed.");
  console.log(`Owner email: ${input.email}`);
  console.log(`Organization: ${organization.name}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown bootstrap error.";
    console.error(`Bootstrap failed: ${message}`);
    process.exit(1);
  });
