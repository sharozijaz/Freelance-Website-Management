# Agency Website Platform PRD

## 1. Product Vision

### Purpose

The Agency Website Platform is a centralized SaaS product for managing multiple client websites from one agency dashboard. It gives a web design agency a repeatable operating system for creating clients, managing websites, publishing content, handling media, improving SEO, collecting form submissions, and monitoring website performance.

### Problem

Web design agencies often manage client websites across disconnected tools: WordPress installs, hosting accounts, plugins, domain providers, spreadsheets, email threads, and custom codebases. This creates repeated setup work, inconsistent quality, plugin maintenance risk, difficult client handoff, and slow content updates.

The platform solves this by giving the agency one controlled system for client websites while still allowing every client to have their own domain, branding, content, and users.

### Long-Term Vision

The long-term vision is to replace WordPress for the agency with a scalable, reusable, AI-friendly website operating system. Every new client website should become faster to launch because the agency can reuse existing sections, design patterns, content workflows, SEO tools, and dashboard modules.

Over time, the platform should become the agency's internal product: a growing library of reusable website capabilities, client management workflows, and intelligent automation.

## 2. Target Users

### Agency Owner

Goals:

- Manage the entire agency website portfolio from one place.
- See client, website, project, analytics, and operational status.
- Reduce delivery time and long-term maintenance cost.
- Standardize website quality across clients.

Responsibilities:

- Create and oversee client organizations.
- Assign agency admins and client admins.
- Review high-level performance and business metrics.
- Control platform-wide settings and billing-related decisions.

Permissions:

- Full platform access.
- Can manage all clients, users, websites, settings, domains, and content.
- Can publish, archive, suspend, or restore client access.

Common tasks:

- Create a new client.
- Review all active websites.
- Check project and deployment status.
- Manage agency users.
- Review analytics and form volume.

### Agency Admin

Goals:

- Manage day-to-day client website work.
- Build and maintain client content.
- Handle domains, projects, CMS updates, and publishing.

Responsibilities:

- Set up clients and websites.
- Manage content, SEO, media, forms, and navigation.
- Invite client users.
- Coordinate launch workflows.

Permissions:

- Can manage assigned or all client organizations, depending on agency policy.
- Can create and edit websites, content, media, forms, SEO, projects, and domains.
- Cannot change agency-owner-only platform controls unless granted.

Common tasks:

- Create pages.
- Publish blog posts.
- Upload media.
- Connect domains.
- Invite client admins and editors.
- Review form submissions.

### Client Admin

Goals:

- Manage their own website content and users.
- Review website performance.
- Update business information without developer help.

Responsibilities:

- Maintain client-owned content.
- Manage client-side users.
- Review forms and analytics.
- Approve drafts and website changes.

Permissions:

- Access only their own organization.
- Can manage approved content, media, forms, SEO, and users within their organization.
- Cannot view other clients.
- Cannot access agency-level settings.

Common tasks:

- Edit a page.
- Approve a blog post.
- Upload images.
- Invite an internal editor.
- Review contact form submissions.

### Editor

Goals:

- Keep website pages and structured content accurate.
- Make approved content changes quickly.

Responsibilities:

- Edit pages, website sections, navigation, media, and forms.
- Prepare content for review or publication.

Permissions:

- Can create and edit assigned content.
- Can upload media if allowed.
- Can publish only if granted by the organization policy.
- Cannot manage users, billing, domains, or agency settings.

Common tasks:

- Edit homepage sections.
- Update service pages.
- Add testimonials.
- Manage navigation links.

### Writer

Goals:

- Draft and maintain blog content.
- Prepare SEO-friendly written content.

Responsibilities:

- Create blog drafts.
- Add categories, tags, authors, excerpts, and featured images.
- Submit content for review.

Permissions:

- Can create and edit own drafts or assigned posts.
- Can upload approved media if allowed.
- Cannot publish unless explicitly granted.
- Cannot manage pages, users, domains, or settings by default.

Common tasks:

- Write a blog post.
- Add a featured image.
- Save a draft.
- Submit for review.

### Viewer

Goals:

- Review website content, submissions, and performance without making changes.

Responsibilities:

- Read information and provide feedback outside the platform workflow if needed.

Permissions:

- Read-only access to assigned organization areas.
- Cannot create, edit, publish, delete, invite, or configure.

Common tasks:

- View analytics.
- Review published pages.
- Check form submissions.
- Monitor website status.

## 3. Product Navigation

### Dashboard

The Dashboard provides a high-level overview of the agency or client organization. It shows website status, recent activity, project progress, form submissions, analytics highlights, content requiring review, and alerts.

### Clients

Clients lists all organizations managed by the agency. Agency users can create clients, view client profiles, manage client users, see active websites, review project status, and open client-specific workspaces.

### Projects

Projects tracks website design, development, review, and launch work. It gives the agency a structured view of project stage, assigned team members, key links, launch readiness, and client approval status.

### Websites

Websites shows each client website, its domain, deployment status, theme, pages, previews, and production URL. Users can review launch status, open the website, and manage website-level settings.

### CMS

CMS is the content workspace for pages, blog posts, navigation, footer, testimonials, services, redirects, and global site content. It is where authorized users create, edit, preview, schedule, and publish content.

### Media

Media manages images, videos, PDFs, folders, alt text, captions, and file usage. Users can upload files, organize assets, and attach media to pages, posts, and sections.

### SEO

SEO centralizes page metadata, slugs, canonical URLs, Open Graph settings, Twitter Cards, schema, robots settings, sitemaps, redirects, and SEO quality review.

### Forms

Forms lets users create and manage website forms and review submissions. It includes form status, fields, notification behavior, spam state, and submission history.

### Analytics

Analytics shows website traffic, top pages, referral sources, form conversion trends, and performance indicators. Agency users can compare clients; client users can only view their own organization.

### Settings

Settings contains organization profile, users, roles, theme settings, site settings, domain settings, notification preferences, security settings, and platform preferences based on the user's permissions.

## 4. User Flows

### Creating a New Client

1. Agency Owner or Agency Admin opens Clients.
2. User selects Create Client.
3. User enters client name, contact information, status, and optional project details.
4. User confirms creation.
5. Platform creates a client organization.
6. User lands on the new client workspace.
7. Empty states guide the user to create a website, invite users, or add content.

### Creating a Website

1. Agency user opens the client workspace.
2. User selects Create Website.
3. User enters website name, target domain, theme starting point, and project association.
4. User selects whether to start from a template or an empty page structure.
5. Platform creates the website record.
6. User is directed to website setup with next steps for theme, content, domain, and deployment.

### Connecting a Domain

1. Agency user opens Websites or Settings.
2. User selects Add Domain.
3. User enters the domain name.
4. Platform validates the domain format.
5. Platform shows required DNS instructions.
6. User completes DNS changes outside the platform.
7. User clicks Verify Domain.
8. Platform shows pending, verified, or failed status.
9. When verified, the domain can be marked primary.

### Publishing a Blog

1. Writer opens CMS and selects Blog.
2. Writer creates a new post.
3. Writer enters title, content, excerpt, featured image, author, categories, tags, and SEO fields.
4. Writer saves as draft or submits for review.
5. Editor or admin reviews the draft through preview.
6. Authorized user publishes immediately or schedules publication.
7. Platform confirms the post is live or scheduled.

### Editing a Page

1. Authorized user opens CMS and selects Pages.
2. User opens an existing page.
3. User edits page content using reusable sections.
4. User updates SEO and preview settings if needed.
5. User previews the page.
6. User saves draft, schedules, or publishes.
7. Platform confirms the new page status.

### Inviting a Client

1. Agency user opens a client workspace.
2. User opens Users or Settings.
3. User selects Invite User.
4. User enters email address and role.
5. Platform validates the email and role.
6. Platform sends an invitation.
7. Invited user accepts and creates an account.
8. User gains access only to the assigned organization.

### Deploying a Website

1. Agency user opens the website setup checklist.
2. User confirms required content, theme, domain, SEO, and launch checks.
3. User starts deployment or marks the website ready for launch.
4. Platform shows deployment progress.
5. Platform confirms successful deployment and production URL.
6. If deployment fails, platform shows a clear failure state and next action.

## 5. Functional Requirements

### Dashboard Module

Purpose:

- Provide a fast operational overview for agency and client users.

Features:

- Portfolio overview.
- Website status cards.
- Recent activity.
- Content review queue.
- Recent form submissions.
- Analytics summary.
- Alerts and launch checklist items.

Rules:

- Agency users see cross-client summaries.
- Client users see only their own organization.

Permissions:

- Viewer and above can view allowed dashboard data.
- Admin roles can act on alerts and pending tasks.

Validation:

- Dashboard filters must require a valid organization or permitted portfolio scope.

Success states:

- Key metrics and tasks load successfully.
- User can navigate to relevant modules.

Error states:

- Metrics unavailable.
- Permission denied.
- Organization not found.

Empty states:

- No clients yet.
- No websites yet.
- No recent activity.

### Clients Module

Purpose:

- Manage agency client organizations.

Features:

- Client list.
- Client profile.
- Client status.
- Assigned users.
- Website and project summary.
- Client creation and archival.

Rules:

- Client records represent organizations.
- Archived clients are hidden from default views but remain recoverable by permitted agency users.

Permissions:

- Agency Owner has full access.
- Agency Admin can manage clients based on assignment.
- Client users cannot access the Clients module globally.

Validation:

- Client name is required.
- Client slug must be unique.
- Contact email must be valid when provided.

Success states:

- Client created.
- Client updated.
- Client archived or restored.

Error states:

- Duplicate client slug.
- Missing required fields.
- User lacks permission.

Empty states:

- No clients have been created.

### Projects Module

Purpose:

- Track website delivery work from planning through launch.

Features:

- Project list.
- Project status.
- Assigned team.
- Figma link.
- Website association.
- Launch readiness checklist.

Rules:

- A project belongs to one client.
- A project may be linked to one or more website deliverables.

Permissions:

- Agency users can manage projects.
- Client Admin can view and approve assigned project items if enabled.
- Viewer can read assigned project information.

Validation:

- Project name and client are required.
- Project status must use an approved lifecycle state.

Success states:

- Project created.
- Project status updated.
- Launch checklist completed.

Error states:

- Invalid status transition.
- Missing client.
- Permission denied.

Empty states:

- No active projects.

### Websites Module

Purpose:

- Manage client websites, website status, deployment readiness, domains, and theme selection.

Features:

- Website list.
- Website detail page.
- Website setup checklist.
- Domain status.
- Deployment status.
- Theme summary.
- Preview and production links.

Rules:

- Every website belongs to one client.
- Every production website must have a primary domain before launch.
- Website visibility and management are tenant-scoped.

Permissions:

- Agency Owner and Agency Admin can manage websites.
- Client Admin can manage website settings approved for clients.
- Editors may edit content but not deployment or domain settings by default.

Validation:

- Website name is required.
- Primary domain must be valid and verified before launch.

Success states:

- Website created.
- Website ready for launch.
- Website deployed.

Error states:

- Domain not verified.
- Deployment failed.
- Missing required launch items.

Empty states:

- No websites for this client.

### CMS Module

Purpose:

- Manage pages, blog posts, reusable content, navigation, footer, redirects, and site settings.

Features:

- Pages.
- Blog posts.
- Authors.
- Categories.
- Tags.
- Navigation.
- Footer.
- Testimonials.
- Services.
- Redirects.
- Drafts.
- Revisions.
- Scheduled publishing.
- Preview URLs.

Rules:

- Content belongs to one client organization.
- Draft content does not appear publicly until published.
- Scheduled content publishes only at the scheduled time.
- Slugs must be unique within the client website.

Permissions:

- Agency Owner and Agency Admin can manage all assigned content.
- Client Admin can manage own organization content.
- Editor can edit pages and approved content.
- Writer can create and edit assigned blog drafts.
- Viewer can read content.

Validation:

- Title is required.
- Slug is required and must be valid.
- Required SEO fields should be flagged before publish.
- Required block fields must be completed before publish.

Success states:

- Draft saved.
- Preview generated.
- Content published.
- Content scheduled.
- Previous version restored as draft.

Error states:

- Invalid slug.
- Missing required fields.
- Publish permission denied.
- Preview expired.

Empty states:

- No pages.
- No blog posts.
- No drafts awaiting review.

### Media Module

Purpose:

- Manage reusable website assets.

Features:

- Upload images, videos, and PDFs.
- Folder organization.
- Alt text and captions.
- Search and filter.
- Usage references.
- File details.

Rules:

- Media belongs to one client organization.
- Public media should have alt text when used in meaningful page content.
- Unsupported file types are rejected.

Permissions:

- Admins and Editors can upload and manage media.
- Writers can upload media if allowed.
- Viewers can view media.

Validation:

- File type must be allowed.
- File size must be within limit.
- Alt text should be required for meaningful images used on published pages.

Success states:

- File uploaded.
- Metadata saved.
- Media attached to content.

Error states:

- Upload failed.
- File too large.
- Unsupported file type.
- Permission denied.

Empty states:

- No media uploaded.

### SEO Module

Purpose:

- Improve and manage search readiness for each website.

Features:

- Metadata review.
- Slug management.
- Canonical URLs.
- Open Graph and Twitter Card settings.
- Schema fields.
- Robots and noindex controls.
- Sitemap status.
- Redirect management.
- SEO issue list.

Rules:

- Every publishable page should have basic metadata.
- Noindex pages should be clearly flagged.
- Redirect sources must not conflict with live page slugs.

Permissions:

- Agency Admin, Client Admin, and Editor can manage SEO where allowed.
- Writer can manage SEO for assigned blog posts.
- Viewer can review SEO state.

Validation:

- SEO title length should be within recommended range.
- Meta description should be within recommended range.
- Canonical URL must be valid.
- Redirect destination must be valid.

Success states:

- SEO fields saved.
- Redirect created.
- Sitemap available.

Error states:

- Invalid canonical URL.
- Redirect conflict.
- Missing required metadata.

Empty states:

- No SEO issues found.
- No redirects configured.

### Forms Module

Purpose:

- Create website forms and manage submissions.

Features:

- Form list.
- Form builder.
- Submission inbox.
- Submission status.
- Notification settings.
- Spam status.

Rules:

- Forms belong to one client organization.
- Required fields must be completed before submission.
- Spam submissions should be separated from normal submissions.

Permissions:

- Admins and Editors can create forms.
- Client Admin can view and manage submissions.
- Viewer can view submissions if allowed.

Validation:

- Form name is required.
- Field labels are required.
- Email fields must contain valid email addresses.
- Required submission fields must be present.

Success states:

- Form created.
- Submission received.
- Notification sent.

Error states:

- Invalid submission.
- Spam rejected or flagged.
- Notification failed.

Empty states:

- No forms.
- No submissions.

### Analytics Module

Purpose:

- Help agency and clients understand website performance and engagement.

Features:

- Traffic overview.
- Top pages.
- Referral sources.
- Form conversion summary.
- Date range filters.
- Client-level and portfolio-level views.

Rules:

- Agency users can view permitted portfolio data.
- Client users can view only their own analytics.
- Analytics should never expose another tenant's data.

Permissions:

- Viewer and above can view permitted analytics.
- Admins can configure analytics settings.

Validation:

- Date ranges must be valid.
- Organization scope must be permitted.

Success states:

- Metrics loaded.
- Filters applied.

Error states:

- Analytics unavailable.
- Invalid date range.
- Permission denied.

Empty states:

- No traffic data yet.
- No form conversions yet.

### Settings Module

Purpose:

- Manage organization, user, theme, website, security, and notification preferences.

Features:

- Organization profile.
- User management.
- Roles and invitations.
- Theme settings.
- Site settings.
- Domain settings.
- Notification preferences.
- Security settings.

Rules:

- Settings visibility depends on role.
- Client settings are scoped to one organization.
- Agency-level settings are restricted to agency roles.

Permissions:

- Agency Owner can manage all settings.
- Agency Admin can manage assigned operational settings.
- Client Admin can manage approved organization settings.
- Editor, Writer, and Viewer have limited or read-only access.

Validation:

- Required organization fields must be present.
- Theme values must be valid.
- Emails must be valid.
- Role assignments must be permitted.

Success states:

- Settings saved.
- User invited.
- Theme updated.

Error states:

- Invalid setting.
- Permission denied.
- Invite failed.

Empty states:

- No users invited yet.
- No custom theme configured.

## 6. Non Functional Requirements

### Performance

- Dashboard pages should feel fast for routine agency workflows.
- Public websites should load quickly on desktop and mobile.
- Published pages should support caching and fast repeat visits.
- Media-heavy pages should remain responsive and optimized.

### Accessibility

- Core workflows must be usable with keyboard navigation.
- UI controls must have accessible names and states.
- Text contrast should meet WCAG AA expectations.
- Forms must provide clear labels, validation messages, and focus behavior.

### SEO

- Public websites must support editable metadata, clean slugs, canonical URLs, structured data, sitemap output, robots rules, and image alt text.
- SEO quality issues should be visible before publishing.

### Security

- Users must authenticate before accessing private dashboard areas.
- Role-based permissions must protect all client data.
- Client data must be isolated by organization.
- Sensitive actions should be logged.
- Public forms and authentication flows should be protected against abuse.

### Scalability

- The platform should support many clients and websites without changing the product model.
- Navigation, search, filtering, and organization switching should remain usable as the agency grows.

### Reliability

- Publishing, preview, deployment status, and domain status should provide clear feedback.
- Failed operations should not leave users guessing.
- Important user actions should be recoverable where practical.

### Maintainability

- Product behavior should be consistent across modules.
- Reusable website sections and shared UI patterns should reduce duplicated work.
- Product surfaces should use consistent naming, statuses, and empty states.

### Responsiveness

- Dashboard workflows should support common desktop and laptop sizes.
- Client-facing public websites must be responsive across mobile, tablet, and desktop.
- Critical dashboard review tasks should be usable on tablet-sized screens.

### Browser Support

- Latest stable versions of Chrome, Edge, Safari, and Firefox.
- Public websites should degrade gracefully for users on older modern browsers.

## 7. MVP Scope

### Included in Version 1.0

- Agency dashboard.
- Client organization management.
- Role-based user access.
- Client workspaces.
- Website records and setup checklist.
- Domain tracking and verification status.
- CMS for pages, blog posts, media, navigation, footer, services, testimonials, redirects, and site settings.
- Visual page builder using reusable content sections.
- Drafts, revisions, previews, scheduled publishing, and content history.
- Tenant-aware theme settings.
- Shared component and section reuse policy.
- Media library.
- SEO metadata and basic SEO review.
- Forms and submissions.
- Basic analytics overview.
- Deployment status tracking.
- Settings for organization, users, theme, website, and notifications.

### Not Included in Version 1.0

- Full billing and payment collection.
- Advanced invoice automation.
- Advanced CRM features.
- AI-generated content features.
- AI design generation.
- Marketplace for third-party themes or plugins.
- Multi-language content management.
- Enterprise single sign-on.
- White-label reseller portals.
- Advanced A/B testing.
- Advanced marketing automation.
- Real-time collaborative editing.
- Native mobile applications.

## 8. Future Roadmap

Version 2 and beyond may include:

- AI Blog Writer.
- AI SEO Assistant.
- AI Metadata Generator.
- AI Accessibility Checker.
- AI Alt Text Generator.
- AI Content Rewriter.
- AI Component Generator.
- AI Design Suggestions.
- Advanced analytics and conversion tracking.
- Billing and subscriptions.
- Client approvals and commenting workflows.
- Multi-language websites.
- White-label client portal.
- Template marketplace.
- Advanced theme editor.
- A/B testing.
- CRM integrations.
- Email marketing integrations.
- Advanced form automations.
- Uptime monitoring.
- Automated performance audits.

## 9. Success Metrics

### Client Setup

- Median time to create a new client: under 5 minutes.
- Median time to invite first client admin: under 2 minutes.

### Website Launch

- Median time to create a website record and setup checklist: under 10 minutes.
- Median time from approved design to publishable website should decrease over repeated projects.
- Percentage of launches completed without manual domain tracking spreadsheets: 100%.

### Publishing

- Median time to publish a blog post after draft approval: under 3 minutes.
- Percentage of published pages with complete required SEO metadata: at least 95%.

### SEO Quality

- Percentage of public pages with SEO title and meta description: at least 95%.
- Percentage of meaningful images with alt text: at least 90%.
- Sitemap availability for launched websites: 100%.

### Performance

- Public website pages should meet agreed performance targets for mobile and desktop.
- Media optimization issues should be visible before launch.

### Maintenance

- Reusable section adoption should increase over time.
- New client websites should require fewer net-new custom sections as the library matures.
- Repeated bugs in shared sections should be fixed once and benefit all future websites.

### Developer Productivity

- Time to assemble a common marketing page should decrease as the section registry grows.
- Ratio of reused sections to newly created sections should improve across projects.

### User Satisfaction

- Agency users can find client, website, and content status without external spreadsheets.
- Client admins can complete routine content edits without developer assistance.

## 10. Development Milestones

### Milestone 1: Product Foundation

Goal:

- Establish the core product shape and shared language for clients, websites, users, roles, and content.

Features:

- Product navigation.
- Role definitions.
- Client organization model.
- Website model.
- Core settings structure.

Dependencies:

- Finalized architecture.
- Approved PRD.

Expected outcome:

- Team alignment on Version 1.0 scope and product behavior.

### Milestone 2: Account and Client Management

Goal:

- Enable the agency to create clients and manage user access.

Features:

- Client list and profile.
- User invitations.
- Role assignment.
- Client workspace access.

Dependencies:

- Role model.
- Organization model.

Expected outcome:

- Agency users can create clients and invite the right people into the right workspace.

### Milestone 3: Website Management

Goal:

- Allow agency users to create and manage website records for clients.

Features:

- Website list.
- Website detail.
- Setup checklist.
- Domain status.
- Deployment status.

Dependencies:

- Client management.
- Permission model.

Expected outcome:

- Every client can have one or more trackable websites with launch status and ownership.

### Milestone 4: CMS and Page Builder

Goal:

- Enable structured content management for pages, blogs, and reusable website sections.

Features:

- Pages.
- Blog posts.
- Navigation.
- Footer.
- Services.
- Testimonials.
- Redirects.
- Visual page builder.
- Draft and publish workflow.

Dependencies:

- Website management.
- Roles and permissions.
- Shared content model.

Expected outcome:

- Authorized users can create, preview, and publish website content.

### Milestone 5: Theme and Media Management

Goal:

- Let each client website maintain its own brand identity and media library.

Features:

- Theme settings.
- Logo and favicon management.
- Color and typography settings.
- Media upload.
- Folder organization.
- Alt text and captions.

Dependencies:

- Client and website settings.
- CMS publishing workflow.

Expected outcome:

- Client websites can look distinct while using the same product system.

### Milestone 6: SEO and Forms

Goal:

- Support core website growth and lead capture workflows.

Features:

- SEO metadata.
- Sitemap status.
- Redirect management.
- SEO issue review.
- Form creation.
- Submission inbox.
- Notification settings.

Dependencies:

- CMS content.
- Website records.
- Permissions.

Expected outcome:

- Websites can publish SEO-ready pages and collect client leads.

### Milestone 7: Analytics and Operational Dashboard

Goal:

- Give agency and client users visibility into website activity and operational status.

Features:

- Dashboard overview.
- Traffic summary.
- Top pages.
- Form conversion summary.
- Recent activity.
- Alerts.

Dependencies:

- Websites.
- Forms.
- Content status.

Expected outcome:

- Users can understand what is happening across websites without leaving the platform.

### Milestone 8: Launch Readiness and Version 1.0 Release

Goal:

- Prepare the platform for real agency use.

Features:

- End-to-end launch checklist.
- Empty states.
- Error states.
- Permission review.
- Accessibility review.
- Product QA.
- Documentation for agency workflows.

Dependencies:

- All Version 1.0 modules.

Expected outcome:

- Platform is ready for the agency to manage real client websites from one dashboard.
