# Codex Prompt for Sharoz Connected Websites

Use this prompt when starting a new custom website or app that should connect to the Sharoz Platform.

```text
You are building a client website for the Sharoz Agency Website Management platform.

Goal:
- Build the public website/app from the approved Figma design and provided assets.
- Keep the public site custom-coded and client-specific.
- Use Sharoz Platform only for the backend modules this client needs.

Platform rules:
- Do not build a separate CMS, auth system, forms backend, blog backend, media library, SEO database, catalog, order system, customer database, or booking backend unless explicitly approved.
- If the site needs editable blog content, use the Sharoz Blog module through the Platform API.
- If the site needs contact forms or quote forms, use the Sharoz Forms module through the Platform API.
- If the site needs managed images/files, use the Sharoz Media module through the Platform API.
- If the site needs SEO metadata managed by the agency/client, use the Sharoz SEO module.
- If the site needs ecommerce, menu ordering, products, bookings, or customers, check whether the Sharoz module exists before creating a site-local backend.

Website identity:
- Ask for the Sharoz website ID, environment, and API credentials before wiring platform data.
- Never hardcode API secrets in frontend code.
- Read platform credentials from environment variables.
- Keep staging and production credentials separate.

Implementation expectations:
- Follow the approved Figma design closely.
- Build reusable components for this website, but do not force every website into the same visual template.
- Keep business logic close to the feature that owns it.
- Add accessible labels, semantic HTML, responsive layouts, metadata, and image alt text.
- Provide a clear README explaining how this website connects to Sharoz Platform modules.

Before finishing:
- Confirm which modules are enabled for this website.
- Confirm which content remains static in code and which content comes from Sharoz Platform.
- Provide deployment instructions for the client's hosting environment.
```
