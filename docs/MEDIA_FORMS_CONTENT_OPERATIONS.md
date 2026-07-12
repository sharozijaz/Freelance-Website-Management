# Media, Forms, and Content Operations

Milestone 14 adds the day-to-day operations layer for agency-managed websites. Payload CMS remains the content editing system. The dashboard provides scoped operational views, attention rules, and workflow actions that send users back to Payload where full editing belongs.

## Media Operations

Media records continue to come from the shared Payload media architecture and the `media_assets` database table used by the dashboard. Media is scoped by organization and optionally by website. Dashboard queries always apply the active tenant scope before filtering by filename, MIME type, website, or upload date.

The Media screen supports:

- viewing accessible media metadata
- searching by filename
- filtering by type and website
- identifying images missing alt text
- opening existing media in Payload CMS
- uploading through the Payload media workflow

Attention rules flag missing alt text, unassigned media, large image files, and unsupported MIME types. Thresholds are configurable in the attention utility.

## Forms Architecture

Forms belong to an organization and website. The foundation includes:

- `forms` for name, slug, status, success message, redirect, and notification configuration slots
- `form_fields` for typed field definitions and validation metadata
- `form_submissions` for normalized submission data and operational status

Supported fields are text, email, phone, textarea, select, radio, checkbox, consent, and hidden. The dashboard currently creates a simple production form definition and stores fields in normalized rows. It does not implement a visual form builder.

## Form Renderer

The website renderer uses a generic pipeline:

Form definition -> field registry -> semantic field component -> server validation -> submission storage

The Contact block can reference a configured form by `formId` or receive an embedded form definition. The renderer resolves the form server-side and renders accessible, responsive, theme-aware markup using the shared component library.

## Submission Security

Submissions are validated on the server. The handler enforces:

- request payload size limit
- published form availability
- authoritative field allowlisting
- unknown field rejection
- required field validation
- honeypot handling
- HTTPS or relative-only safe redirects
- no submission values in audit logs

Submission lists intentionally exclude submitted values. Values are only displayed on the protected detail screen and rendered as text.

## Content Operations

The Content screen is an operational gateway into Payload CMS. It supports query-driven filters for search, content type, website, publication status, and sort order. Actions open records in Payload, create pages/posts in Payload, or route users to preview/published experiences when those URLs are available.

## Website Detail Integration

Website Detail includes compact operational summary cards for media count, missing alt text, active forms, unread submissions, and draft content. These cards are navigation and attention aids, not analytics dashboards.

## Permissions and Privacy

All dashboard operations reuse the existing organization-aware RBAC layer:

- media and content views require CMS read access
- form and submission views require `forms:read`
- form creation and submission status updates require `forms:manage`
- all queries are tenant-scoped and website-aware

Activity descriptions intentionally avoid submitted form values. Audit logs may record the form, website, and submission resource IDs, but never the submitted payload.

## Future Extensions

This foundation can be extended with retention policies, spam scoring, notification delivery, richer form editing, submission export permissions, and deeper Payload relationship support without changing the dashboard privacy boundary or the website form renderer API.
