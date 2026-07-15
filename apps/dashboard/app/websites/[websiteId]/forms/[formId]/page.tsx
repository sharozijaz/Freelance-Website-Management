import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@agency/ui";
import { DashboardPage } from "@/components/dashboard-page";
import { UnauthorizedState } from "@/components/state-panels";
import { WebsiteNavigation } from "@/components/website-navigation";
import { database } from "@/lib/auth";
import { createDashboardRequest } from "@/lib/dashboard/access";
import { requireFormAccess } from "@/lib/dashboard/content-ops";
import { getDashboardSessionContext } from "@/lib/session";

export const metadata = {
  title: "Edit Form",
};

export default async function WebsiteFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ formId: string; websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Edit Form">
        <UnauthorizedState message="Sign in to manage this form." />
      </DashboardPage>
    );
  }

  const { formId, websiteId } = await params;
  const rawSearchParams = await searchParams;
  const error = typeof rawSearchParams.error === "string" ? rawSearchParams.error : null;
  const form = await requireFormAccess({
    database,
    formId,
    request: createDashboardRequest(context),
  });
  const configuration = formConfiguration(form.configuration);
  const fieldDefinitions = form.fields
    .map((field) =>
      [
        field.name,
        field.label,
        field.type,
        field.required ? "required" : "optional",
        field.options.map((option) => `${option.value}:${option.label}`).join(","),
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");

  return (
    <DashboardPage
      description="Edit the public form contract used by connected websites."
      title={`${form.name} Form`}
    >
      <WebsiteNavigation
        active="forms"
        productionUrl={form.website.productionUrl}
        websiteId={websiteId}
        websiteName={form.website.name}
      />

      {error ? (
        <Card className="border-error">
          <CardContent className="p-4 text-sm text-error">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Form Settings</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {form.deletedAt ? (
              <p className="rounded-md border border-warning bg-warning/10 p-3 text-sm text-warning">
                This form is archived. Duplicate it to create an editable draft, or permanently
                delete it from the forms list.
              </p>
            ) : (
              <form action="/api/forms" className="grid gap-4" method="post">
                <input name="_action" type="hidden" value="save" />
                <input name="formId" type="hidden" value={form.id} />
                <input
                  name="returnTo"
                  type="hidden"
                  value={`/websites/${websiteId}/forms/${form.id}`}
                />
                <input name="formTemplate" type="hidden" value="custom" />

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Form name</Label>
                    <Input defaultValue={form.name} id="name" name="name" required />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      defaultValue={form.status}
                      id="status"
                      name="status"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="successMessage">Success message</Label>
                    <Input
                      defaultValue={configuration.successMessage ?? ""}
                      id="successMessage"
                      name="successMessage"
                    />
                  </div>
                  <div>
                    <Label htmlFor="redirectUrl">Redirect URL</Label>
                    <Input
                      defaultValue={configuration.redirectUrl ?? ""}
                      id="redirectUrl"
                      name="redirectUrl"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="fieldDefinitions">Fields</Label>
                  <textarea
                    className="min-h-56 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                    defaultValue={fieldDefinitions}
                    id="fieldDefinitions"
                    name="fieldDefinitions"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Format: name | Label | type | required | value:Label,value:Label. Supported
                    public types: text, email, phone, textarea, select, checkbox.
                  </p>
                </div>

                <Button type="submit">Save Form</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <Button asChild className="w-full" variant="outline">
                <Link href={`/websites/${websiteId}/forms/${form.id}/submissions`}>
                  View Submissions
                </Link>
              </Button>
              <form action="/api/forms" method="post">
                <input name="_action" type="hidden" value="duplicate" />
                <input name="formId" type="hidden" value={form.id} />
                <input name="returnTo" type="hidden" value={`/websites/${websiteId}/forms`} />
                <Button className="w-full" type="submit" variant="outline">
                  Duplicate as Draft
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-error">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <p className="text-sm text-muted-foreground">
                Archive hides the form from public API responses. Permanent delete is available
                after archive and cannot be undone.
              </p>
              {!form.deletedAt ? (
                <form action="/api/forms" method="post">
                  <input name="_action" type="hidden" value="archive" />
                  <input name="formId" type="hidden" value={form.id} />
                  <input
                    name="returnTo"
                    type="hidden"
                    value={`/websites/${websiteId}/forms/${form.id}`}
                  />
                  <Button className="w-full" type="submit" variant="destructive">
                    Archive Form
                  </Button>
                </form>
              ) : (
                <form action="/api/forms" method="post">
                  <input name="_action" type="hidden" value="delete" />
                  <input name="formId" type="hidden" value={form.id} />
                  <input name="returnTo" type="hidden" value={`/websites/${websiteId}/forms`} />
                  <Button className="w-full" type="submit" variant="destructive">
                    Delete Permanently
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </DashboardPage>
  );
}

function formConfiguration(value: Record<string, unknown>) {
  return {
    redirectUrl: typeof value.redirectUrl === "string" ? value.redirectUrl : null,
    successMessage: typeof value.successMessage === "string" ? value.successMessage : null,
  };
}
