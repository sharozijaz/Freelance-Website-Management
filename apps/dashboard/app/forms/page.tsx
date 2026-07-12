import Link from "next/link";
import { Send } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Label } from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { FilterBar } from "@/components/filter-bar";
import { UnauthorizedState } from "@/components/state-panels";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { getForms } from "@/lib/dashboard/content-ops";
import { parseDashboardSearchParams } from "@/lib/dashboard/filters";
import { getProjectCreationOptions } from "@/lib/dashboard/projects";
import { getDashboardSessionContext } from "@/lib/session";

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

  const params = parseDashboardSearchParams(await searchParams);
  const request = createDashboardRequest(context);
  const [forms, options] = await Promise.all([
    getForms({ database, params, request }),
    getProjectCreationOptions({ database, request }),
  ]);

  return (
    <DashboardPage description="Website form definitions and submission workflow entry point." title="Forms">
      <FilterBar
        defaultQuery={params.query}
        defaultSort={params.sort}
        defaultStatus={params.status}
        statuses={["draft", "published", "archived"]}
      />

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Create Form</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {options.websites.length === 0 ? (
            <EmptyState title="Create a website before adding forms" />
          ) : (
            <form action="/api/forms" className="grid gap-3 xl:grid-cols-4" method="post">
              <div>
                <Label htmlFor="websiteId">Website</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="websiteId" name="websiteId" required>
                  {options.websites.map((website) => (
                    <option key={website.id} value={website.id}>{website.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="name">Form name</Label>
                <Input id="name" name="name" required />
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
                <Label htmlFor="fieldLabel">First field label</Label>
                <Input defaultValue="Email" id="fieldLabel" name="fieldLabel" />
              </div>
              <div>
                <Label htmlFor="fieldType">First field type</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="fieldType" name="fieldType">
                  <option value="email">Email</option>
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input defaultChecked name="fieldRequired" type="checkbox" value="true" />
                Required
              </label>
              <Button className="self-end" type="submit">Create Form</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {forms.items.length === 0 ? (
        <EmptyState
          description="Forms created for accessible websites will appear here."
          icon={<Send className="size-5" />}
          title="No forms found"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {forms.items.map((form) => (
            <div className="grid gap-2 border-b border-border p-4 last:border-b-0 md:grid-cols-[1fr_1fr_0.7fr_auto] md:items-center" key={form.id}>
              <div>
                <p className="font-medium">{form.name}</p>
                <p className="text-sm text-muted-foreground">{form.slug}</p>
              </div>
              <span className="text-sm">{form.websiteName}</span>
              <span className="text-sm text-muted-foreground">{form.status}</span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/submissions?formId=${form.id}`}>Submissions</Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardPage>
  );
}
