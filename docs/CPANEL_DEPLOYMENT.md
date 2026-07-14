# cPanel Production Deployment

This document records the current production deployment workflow for the Sharoz Platform dashboard on cPanel.

The production deployment currently runs:

- Application: `apps/dashboard`
- cPanel application root: `/home/sharozde/manage-app`
- Public URL: `https://manage.sharoz.dev`
- Node.js version: 22
- Startup file: `server.js`
- Database: Neon PostgreSQL

## Deployment Model

Deploy the full monorepo, not only `apps/dashboard`.

The dashboard depends on workspace packages:

- `@agency/auth`
- `@agency/database`
- `@agency/lib`
- `@agency/types`
- `@agency/ui`
- `@sharoz/contracts`
- shared TypeScript and ESLint config packages

The server root must contain:

```text
apps/
packages/
scripts/
docs/
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
turbo.json
```

Do not upload `node_modules`, `.next`, `.turbo`, or old deployment archives.

## cPanel Setup

Create a Node.js application with:

```text
Application root: manage-app
Application URL: manage.sharoz.dev
Application startup file: server.js
Application mode: Production
Node.js version: 22
```

If cPanel also requires a document root for the subdomain, keep it separate from the app root. The app root should remain:

```text
/home/sharozde/manage-app
```

## Required Environment Variables

Set these in cPanel's Node.js App environment variable section:

```text
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://manage.sharoz.dev
BETTER_AUTH_URL=https://manage.sharoz.dev
BETTER_AUTH_SECRET=<long random secret>
DATABASE_URL=<production postgres url>
AUTH_TRUSTED_ORIGINS=https://manage.sharoz.dev
```

Do not set legacy Payload CMS variables for the V2 dashboard unless deliberately running legacy apps.

## Activating The cPanel Node Environment

cPanel Terminal may not expose `node`, `npm`, or `pnpm` until the application environment is activated:

```bash
source /home/sharozde/nodevenv/manage-app/22/bin/activate
cd /home/sharozde/manage-app
```

Install pnpm if the virtual environment was recreated:

```bash
npm install -g pnpm@11.7.0
pnpm -v
```

## Install

Clean stale install artifacts before reinstalling:

```bash
cd /home/sharozde/manage-app
rm -rf node_modules
rm -rf apps/*/node_modules packages/*/node_modules
rm -rf apps/dashboard/.next apps/dashboard/.turbo .next .turbo
pnpm install
```

If cPanel creates a broken `node_modules` symlink, remove it before running `pnpm install`.

## Production Check

Run:

```bash
pnpm production:check
```

This validates required environment configuration without printing secret values.

## Database Connectivity

Before migrations, verify the server can reach the database:

```bash
cd /home/sharozde/manage-app/packages/database

pnpm exec node --input-type=module <<'NODE'
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 20,
});

try {
  const result = await sql`select now() as now`;
  console.log("Database connection OK:", result[0].now);
} finally {
  await sql.end();
}
NODE
```

If this times out, the hosting provider may need to allow outbound PostgreSQL traffic to Neon on port `5432`.

## Migrations

After a backup/snapshot has been confirmed:

```bash
cd /home/sharozde/manage-app
pnpm --filter @agency/database db:migrate
```

Do not manually patch production schema. Fix migrations and apply them through Drizzle.

## Build

The cPanel server has limited process capacity. The dashboard Next.js config sets:

```ts
experimental: {
  cpus: 1,
  workerThreads: false,
}
```

Build with:

```bash
cd /home/sharozde/manage-app
NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--max-old-space-size=1024" pnpm --filter @agency/dashboard build
```

## Standalone Static Assets

The dashboard uses `output: "standalone"`.

After every build, copy static assets into the standalone app folder:

```bash
mkdir -p apps/dashboard/.next/standalone/apps/dashboard/.next
rm -rf apps/dashboard/.next/standalone/apps/dashboard/.next/static
cp -R apps/dashboard/.next/static apps/dashboard/.next/standalone/apps/dashboard/.next/static
```

Without this step the app may load without styling.

## Permissions

After every build:

```bash
chmod -R u+rwX apps/dashboard/.next
find apps/dashboard/.next -type d -exec chmod 755 {} \;
find apps/dashboard/.next -type f -exec chmod 644 {} \;
```

This prevents cPanel/Passenger `EACCES` errors while reading built chunks.

## Startup File

Root `server.js` should start the standalone dashboard server:

```js
process.env.NODE_ENV = "production";
process.env.PORT = process.env.PORT || "3000";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

require("./apps/dashboard/.next/standalone/apps/dashboard/server.js");
```

## Restart

Restart from:

```text
cPanel -> Setup Node.js App -> manage-app -> Restart
```

Then verify:

```bash
curl -I http://127.0.0.1:3000
curl http://127.0.0.1:3000/api/health
```

If cPanel assigns a different port, test `$PORT`.

## Owner Bootstrap

The owner bootstrap requires environment variables:

```bash
OWNER_EMAIL="owner@example.com" \
OWNER_PASSWORD="<strong password>" \
OWNER_NAME="Owner Name" \
OWNER_ORGANIZATION_NAME="Sharoz Agency" \
pnpm bootstrap:owner
```

The script is intentionally single-use and refuses to create a second active agency owner.

## Update Checklist

For normal updates:

```bash
source /home/sharozde/nodevenv/manage-app/22/bin/activate
cd /home/sharozde/manage-app
pnpm install
pnpm production:check
pnpm --filter @agency/database db:migrate
NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--max-old-space-size=1024" pnpm --filter @agency/dashboard build
mkdir -p apps/dashboard/.next/standalone/apps/dashboard/.next
rm -rf apps/dashboard/.next/standalone/apps/dashboard/.next/static
cp -R apps/dashboard/.next/static apps/dashboard/.next/standalone/apps/dashboard/.next/static
chmod -R u+rwX apps/dashboard/.next
find apps/dashboard/.next -type d -exec chmod 755 {} \;
find apps/dashboard/.next -type f -exec chmod 644 {} \;
```

Then restart the cPanel Node.js app.

