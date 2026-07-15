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
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getForms } from "@/lib/dashboard/content-ops";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getProjectCreationOptions } from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Forms",
};

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Forms">
        <UnauthorizedState message="Sign in to manage website forms." />
      </DashboardPage>
    );
  }

  const rawSearchParams = await searchParams;
  const params = parseDashboardSearchParams(rawSearchParams);
  const error = typeof rawSearchParams.error === "string" ? rawSearchParams.error : null;
  const request = createDashboardRequest(context);
  const [forms, options] = await Promise.all([
    getForms({ database, params, request }),
    getProjectCreationOptions({ database, request }),
  ]);

  return (
    <DashboardPage
      description="Create website-owned forms and review submissions. Custom websites submit to these forms through the Platform API."
      title="Forms"
    >
      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={["draft", "published", "archived"]}
      />

      {error ? (
        <Card className="border-error">
          <CardContent className="p-4 text-sm text-error">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Create Form</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {options.websites.length === 0 ? (
            <EmptyState
              description="Forms belong to a website because submissions must stay scoped to the right client and site."
              title="Create a website before adding forms"
            />
          ) : (
            <form action="/api/forms" className="grid gap-3 xl:grid-cols-4" method="post">
              <div>
                <Label htmlFor="websiteId">Website</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  id="websiteId"
                  name="websiteId"
                  required
                >
                  {options.websites.map((website) => (
                    <option key={website.id} value={website.id}>
                      {website.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="name">Form name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="formTemplate">Field template</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="custom"
                  id="formTemplate"
                  name="formTemplate"
                >
                  <option value="custom">Custom fields below</option>
                  <option value="contact">Contact: name, email, topic, message</option>
                  <option value="catering">
                    Catering: name, email, phone, event date, guests, style, notes
                  </option>
                </select>
              </div>
              <div>
                <Label htmlFor="successMessage">Success message</Label>
                <Input id="successMessage" name="successMessage" />
              </div>
              <div>
                <Label htmlFor="redirectUrl">Redirect URL</Label>
                <Input id="redirectUrl" name="redirectUrl" />
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
              <input name="returnTo" type="hidden" value="/forms" />
            </form>
          )}
        </CardContent>
      </Card>

      {forms.items.length === 0 ? (
        <EmptyState
          description="Create a form for a website, then connect the custom website form to the Platform API."
          icon={<Send className="size-5" />}
          title="No forms found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {forms.items.map((form) => (
            <div
              className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1fr_1fr_0.7fr_auto] md:items-center"
              key={form.id}
            >
              <div>
                <p className="font-medium">{form.name}</p>
                <p className="text-sm text-muted-foreground">{form.slug}</p>
              </div>
              <span className="text-sm">{form.websiteName}</span>
              <span className="text-sm text-muted-foreground">{form.status}</span>
              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/submissions?formId=${form.id}`}>Submissions</Link>
                </Button>
                <form action="/api/forms" method="post">
                  <input name="_action" type="hidden" value="archive" />
                  <input name="formId" type="hidden" value={form.id} />
                  <input name="returnTo" type="hidden" value="/forms" />
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
