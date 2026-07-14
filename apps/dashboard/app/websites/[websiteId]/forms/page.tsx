import Link from "next/link";
import { Send } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
} from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getForms } from "@/lib/dashboard/content-ops";
import { getWebsiteDetail } from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

export default async function WebsiteFormsPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Website Forms">
        <UnauthorizedState message="Sign in to manage website forms." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const request = createDashboardRequest(context);
  const [detail, forms] = await Promise.all([
    getWebsiteDetail({ database, request, websiteId }),
    getForms({
      database,
      params: { page: 1, query: "", sort: "updated_desc", status: "all", websiteId },
      request,
    }),
  ]);

  return (
    <DashboardPage
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={`/websites/${websiteId}`}>Back to Website</Link>
        </Button>
      }
      description="Website-scoped public form definitions for connected websites."
      title={`Forms for ${detail.website.name}`}
    >
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Create Contact Form</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form action="/api/forms" className="grid gap-3 xl:grid-cols-4" method="post">
            <input name="returnTo" type="hidden" value={`/websites/${websiteId}/forms`} />
            <input name="websiteId" type="hidden" value={websiteId} />
            <div>
              <Label htmlFor="name">Form name</Label>
              <Input defaultValue="Contact" id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="formTemplate">Field template</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue="contact"
                id="formTemplate"
                name="formTemplate"
              >
                <option value="contact">Contact: name, email, topic, message</option>
                <option value="catering">
                  Catering: name, email, phone, event date, guests, style, notes
                </option>
                <option value="custom">Custom fields below</option>
              </select>
            </div>
            <div>
              <Label htmlFor="successMessage">Success message</Label>
              <Input
                defaultValue="Thanks, your message was received."
                id="successMessage"
                name="successMessage"
              />
            </div>
            <div>
              <Label htmlFor="fieldName">Single field name</Label>
              <Input defaultValue="email" id="fieldName" name="fieldName" />
            </div>
            <div>
              <Label htmlFor="fieldLabel">Single field label</Label>
              <Input defaultValue="Email" id="fieldLabel" name="fieldLabel" />
            </div>
            <div>
              <Label htmlFor="fieldType">Single field type</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="fieldType"
                name="fieldType"
              >
                <option value="email">Email</option>
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="phone">Phone</option>
                <option value="select">Select</option>
                <option value="checkbox">Checkbox</option>
              </select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input defaultChecked name="fieldRequired" type="checkbox" value="true" />
              Required
            </label>
            <div className="xl:col-span-4">
              <Label htmlFor="fieldDefinitions">Custom field definitions</Label>
              <textarea
                className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="fieldDefinitions"
                name="fieldDefinitions"
                placeholder={[
                  "name | Name | text | required",
                  "email | Email | email | required",
                  "topic | Topic | select | required | general:General question,feedback:Feedback",
                  "message | Message | textarea | required",
                ].join("\n")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Format: name | Label | type | required | value:Label,value:Label. Templates ignore
                this box.
              </p>
            </div>
            <Button className="self-end" type="submit">
              Create Form
            </Button>
          </form>
        </CardContent>
      </Card>

      {forms.items.length === 0 ? (
        <EmptyState
          description="Create a public form before connecting the website contact page."
          icon={<Send className="size-5" />}
          title="No forms found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {forms.items.map((form) => (
            <div
              className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1fr_0.7fr_auto] md:items-center"
              key={form.id}
            >
              <div>
                <p className="font-medium">{form.name}</p>
                <p className="text-sm text-muted-foreground">{form.slug}</p>
              </div>
              <span className="text-sm text-muted-foreground">{form.status}</span>
              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/websites/${websiteId}/forms/${form.id}/submissions`}>
                    Submissions
                  </Link>
                </Button>
                <form action="/api/forms" method="post">
                  <input name="_action" type="hidden" value="archive" />
                  <input name="formId" type="hidden" value={form.id} />
                  <input name="returnTo" type="hidden" value={`/websites/${websiteId}/forms`} />
                  <Button size="sm" type="submit" variant="destructive">
                    Archive
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
