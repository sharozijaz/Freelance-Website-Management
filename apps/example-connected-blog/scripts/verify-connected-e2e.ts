import { createSharozClient, isSharozApiError } from "@sharoz/sdk";

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();

  return value && value.length > 0 ? value : null;
}

function requiredEnv(name: string) {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`${name} is required for connected E2E verification.`);
  }

  return value;
}

async function expectOk(url: string) {
  const response = await fetch(url, { redirect: "manual" });
  if (response.status < 200 || response.status >= 400) {
    throw new Error(`Expected ${url} to be reachable, got ${String(response.status)}.`);
  }

  return response;
}

async function main() {
  const baseUrl = requiredEnv("SHAROZ_API_BASE_URL");
  const publicKey = requiredEnv("SHAROZ_PUBLIC_KEY");
  const secret = requiredEnv("SHAROZ_SECRET");
  const connectedSiteUrl = optionalEnv("CONNECTED_E2E_SITE_URL");
  const previewToken = optionalEnv("SHAROZ_PREVIEW_ACCESS_TOKEN");
  const stagingToken = optionalEnv("SHAROZ_STAGING_ACCESS_SECRET");

  const client = createSharozClient({ baseUrl, publicKey, secret });
  const posts = await client.blog.posts.list({ limit: 5, page: 1 });
  const forms = await client.forms.list({ limit: 5, page: 1 });

  if (!Array.isArray(posts.items)) {
    throw new Error("Blog posts response did not include an item array.");
  }

  console.log(`Platform API published Blog read passed with ${String(posts.items.length)} posts.`);

  if (!Array.isArray(forms.items)) {
    throw new Error("Forms response did not include an item array.");
  }

  const contactForm = await client.forms.getBySlug("contact");
  if (contactForm.form.slug !== "contact") {
    throw new Error("Contact form slug fetch did not return the expected form.");
  }

  const submission = await client.forms.submit("contact", {
    fields: {
      email: "e2e@example.com",
      message: "Connected E2E submission",
      name: "Connected E2E",
    },
  });

  if (!submission.submissionId) {
    throw new Error("Form submission did not return a submission ID.");
  }

  await expectPlatformError(
    () => client.forms.submit("contact", { fields: { email: "", message: "Missing name" } }),
    "INVALID_REQUEST",
    "Required-field validation did not fail as expected.",
  );
  await expectPlatformError(
    () =>
      client.forms.submit("contact", {
        fields: {
          email: "e2e@example.com",
          message: "Unknown field",
          name: "Connected E2E",
          role: "admin",
        },
      }),
    "INVALID_REQUEST",
    "Unknown-field validation did not fail as expected.",
  );
  await expectPlatformError(
    () => client.forms.getBySlug("missing-cross-site-form"),
    "NOT_FOUND",
    "Missing or cross-site form did not return NOT_FOUND.",
  );

  console.log("Platform API Forms list, fetch, validation, and submission checks passed.");

  if (connectedSiteUrl) {
    await expectOk(`${connectedSiteUrl.replace(/\/$/, "")}/blog`);
    const contactResponse = await expectOk(`${connectedSiteUrl.replace(/\/$/, "")}/contact`);
    const contactHtml = await contactResponse.text();
    if (contactHtml.includes(secret) || contactHtml.includes(publicKey)) {
      throw new Error("Connected contact page rendered API credentials.");
    }
    console.log("Connected site Blog route is reachable.");
    console.log("Connected site Contact route is reachable without credential exposure.");
  }

  if (connectedSiteUrl && previewToken) {
    const url = new URL("/preview", connectedSiteUrl);
    url.searchParams.set("token", previewToken);
    url.searchParams.set("redirect", "/blog");
    const response = await fetch(url, { redirect: "manual" });

    if (response.status !== 307 && response.status !== 308) {
      throw new Error(
        `Preview token route returned ${String(response.status)} instead of redirect.`,
      );
    }

    const cookie = response.headers.get("set-cookie") ?? "";
    if (!cookie.includes("HttpOnly") || !cookie.includes("sharoz_preview")) {
      throw new Error("Preview route did not set an HttpOnly preview cookie.");
    }

    console.log("Preview token route set a server-side preview session cookie.");
  }

  if (connectedSiteUrl && stagingToken) {
    const url = new URL("/staging-access", connectedSiteUrl);
    url.searchParams.set("token", stagingToken);
    url.searchParams.set("redirect", "/blog");
    const response = await fetch(url, { redirect: "manual" });

    if (response.status !== 307 && response.status !== 308) {
      throw new Error(
        `Staging access route returned ${String(response.status)} instead of redirect.`,
      );
    }

    const cookie = response.headers.get("set-cookie") ?? "";
    if (!cookie.includes("HttpOnly") || !cookie.includes("sharoz_staging_access")) {
      throw new Error("Staging access route did not set an HttpOnly access cookie.");
    }

    console.log("Staging access route set a server-side access cookie.");
  }
}

async function expectPlatformError(
  callback: () => Promise<unknown>,
  code: string,
  message: string,
) {
  try {
    await callback();
  } catch (error) {
    if (isSharozApiError(error) && error.code === code) {
      return;
    }
    throw error;
  }

  throw new Error(message);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Connected E2E verification failed.");
  process.exitCode = 1;
});
