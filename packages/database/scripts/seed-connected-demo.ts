import { createHash, randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/schema";
import {
  blogCategories,
  blogPostCategories,
  blogPosts,
  blogPostTags,
  blogTags,
  formFields,
  forms,
  organizations,
  websiteApiCredentials,
  websiteEnvironments,
  websiteModules,
  websites,
} from "../src/schema";
import { assertDemoSeedAllowed } from "../src/operations";

const scriptDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(scriptDir, "../../../.env") });

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function requireSeedConfirmation() {
  assertDemoSeedAllowed(process.env);
}

function token(prefix: "spk" | "sps") {
  return `${prefix}_${randomBytes(prefix === "spk" ? 24 : 32).toString("base64url")}`;
}

function hashSecret(secret: string) {
  return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
}

async function main() {
  requireSeedConfirmation();

  const connectionString = requiredEnv("DATABASE_URL");
  const sql = postgres(connectionString, { max: 1, prepare: false });
  const database = drizzle(sql, { schema });
  const now = new Date();

  try {
    const [organization] = await database
      .insert(organizations)
      .values({
        name: "Sharoz Connected Demo",
        slug: "sharoz-connected-demo",
        status: "active",
      })
      .onConflictDoUpdate({
        set: { name: "Sharoz Connected Demo", status: "active", updatedAt: now },
        target: organizations.slug,
      })
      .returning();

    if (!organization) {
      throw new Error("Demo organization could not be created.");
    }

    const [website] = await database
      .insert(websites)
      .values({
        deploymentStatus: "not_configured",
        name: "Connected Blog Demo",
        organizationId: organization.id,
        previewUrl: "http://localhost:3004",
        productionUrl: "http://localhost:3004",
        slug: "connected-blog-demo",
        status: "active",
        websiteType: "sharoz_connected",
      })
      .onConflictDoUpdate({
        set: {
          name: "Connected Blog Demo",
          previewUrl: "http://localhost:3004",
          productionUrl: "http://localhost:3004",
          status: "active",
          updatedAt: now,
          websiteType: "sharoz_connected",
        },
        target: [websites.organizationId, websites.slug],
      })
      .returning();

    if (!website) {
      throw new Error("Demo website could not be created.");
    }

    for (const moduleKey of ["blog", "forms"] as const) {
      await database
        .insert(websiteModules)
        .values({
          enabled: true,
          moduleKey,
          organizationId: organization.id,
          websiteId: website.id,
        })
        .onConflictDoUpdate({
          set: { enabled: true, updatedAt: now },
          target: [websiteModules.websiteId, websiteModules.moduleKey],
        });
    }

    const [staging] = await database
      .insert(websiteEnvironments)
      .values({
        baseUrl: "http://localhost:3004",
        name: "Staging",
        organizationId: organization.id,
        status: "active",
        type: "staging",
        websiteId: website.id,
      })
      .onConflictDoUpdate({
        set: { baseUrl: "http://localhost:3004", status: "active", updatedAt: now },
        target: [websiteEnvironments.websiteId, websiteEnvironments.type],
      })
      .returning();

    if (!staging) {
      throw new Error("Demo staging environment could not be created.");
    }

    await database
      .insert(websiteEnvironments)
      .values({
        baseUrl: "http://localhost:3004",
        name: "Production",
        organizationId: organization.id,
        status: "active",
        type: "production",
        websiteId: website.id,
      })
      .onConflictDoUpdate({
        set: { baseUrl: "http://localhost:3004", status: "active", updatedAt: now },
        target: [websiteEnvironments.websiteId, websiteEnvironments.type],
      });

    const [category] = await database
      .insert(blogCategories)
      .values({
        name: "News",
        organizationId: organization.id,
        slug: "news",
        websiteId: website.id,
      })
      .onConflictDoUpdate({
        set: { name: "News", updatedAt: now },
        target: [blogCategories.websiteId, blogCategories.slug],
      })
      .returning();

    const [tag] = await database
      .insert(blogTags)
      .values({
        name: "Demo",
        organizationId: organization.id,
        slug: "demo",
        websiteId: website.id,
      })
      .onConflictDoUpdate({
        set: { name: "Demo", updatedAt: now },
        target: [blogTags.websiteId, blogTags.slug],
      })
      .returning();

    const [post] = await database
      .insert(blogPosts)
      .values({
        content: {
          format: "markdown",
          markdown:
            "# Connected Blog Demo\n\nThis post is served through the Sharoz Platform API and rendered by the connected website.",
        },
        excerpt: "A repeatable demo post for testing connected website rendering.",
        organizationId: organization.id,
        publishedAt: now,
        slug: "connected-blog-demo",
        status: "published",
        title: "Connected Blog Demo",
        websiteId: website.id,
      })
      .onConflictDoUpdate({
        set: {
          excerpt: "A repeatable demo post for testing connected website rendering.",
          publishedAt: now,
          status: "published",
          title: "Connected Blog Demo",
          updatedAt: now,
        },
        target: [blogPosts.websiteId, blogPosts.slug],
      })
      .returning();

    if (category && post) {
      await database
        .insert(blogPostCategories)
        .values({
          categoryId: category.id,
          organizationId: organization.id,
          postId: post.id,
          websiteId: website.id,
        })
        .onConflictDoNothing();
    }

    if (post && tag) {
      await database
        .insert(blogPostTags)
        .values({
          organizationId: organization.id,
          postId: post.id,
          tagId: tag.id,
          websiteId: website.id,
        })
        .onConflictDoNothing();
    }

    const [contactForm] = await database
      .insert(forms)
      .values({
        configuration: {
          successMessage: "Thanks, your message was received.",
        },
        name: "Contact",
        organizationId: organization.id,
        slug: "contact",
        status: "published",
        websiteId: website.id,
      })
      .onConflictDoUpdate({
        set: {
          configuration: {
            successMessage: "Thanks, your message was received.",
          },
          name: "Contact",
          status: "published",
          updatedAt: now,
        },
        target: [forms.organizationId, forms.websiteId, forms.slug],
      })
      .returning();

    if (contactForm) {
      const contactFields = [
        {
          fieldOrder: 0,
          label: "Name",
          name: "name",
          placeholder: "Your name",
          required: true,
          type: "text" as const,
        },
        {
          fieldOrder: 1,
          label: "Email",
          name: "email",
          placeholder: "you@example.com",
          required: true,
          type: "email" as const,
        },
        {
          fieldOrder: 2,
          label: "Message",
          name: "message",
          placeholder: "How can we help?",
          required: true,
          type: "textarea" as const,
        },
      ];

      for (const field of contactFields) {
        await database
          .insert(formFields)
          .values({
            ...field,
            formId: contactForm.id,
            organizationId: organization.id,
            websiteId: website.id,
          })
          .onConflictDoUpdate({
            set: {
              fieldOrder: field.fieldOrder,
              label: field.label,
              placeholder: field.placeholder,
              required: field.required,
              type: field.type,
              updatedAt: now,
            },
            target: [formFields.formId, formFields.name],
          });
      }
    }

    const existingCredential = await database.query.websiteApiCredentials.findFirst({
      where: eq(websiteApiCredentials.websiteEnvironmentId, staging.id),
    });

    if (!existingCredential) {
      const publicKey = token("spk");
      const secret = token("sps");

      await database.insert(websiteApiCredentials).values({
        label: "Demo Staging Credential",
        organizationId: organization.id,
        publicKey,
        secretHash: hashSecret(secret),
        status: "active",
        websiteEnvironmentId: staging.id,
        websiteId: website.id,
      });

      console.log("Created demo staging API credential. Store this secret in .env.local once.");
      console.log(`SHAROZ_PUBLIC_KEY=${publicKey}`);
      console.log(`SHAROZ_SECRET=${secret}`);
    } else {
      console.log("Demo staging API credential already exists; no secret was regenerated.");
    }

    console.log("Connected Blog demo seed completed.");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Connected demo seed failed.");
  process.exitCode = 1;
});
