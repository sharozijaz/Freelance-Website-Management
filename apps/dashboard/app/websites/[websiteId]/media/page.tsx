import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
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
import { formatDashboardDateTime } from "@/lib/dashboard/dates";
import {
  archiveWebsiteMediaAsset,
  listWebsiteMediaAssets,
  MediaDomainError,
  registerWebsiteMediaAsset,
  restoreWebsiteMediaAsset,
  updateWebsiteMediaAsset,
} from "@/lib/dashboard/media";
import { getWebsiteDetail } from "@/lib/dashboard/projects";
import { resolvePublicMediaDimensions, resolvePublicMediaUrl } from "@/lib/platform-api/media";
import { getDashboardSessionContext } from "@/lib/session";

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function formNumber(formData: FormData, name: string) {
  const value = formString(formData, name);
  return value ? Number(value) : null;
}

function errorMessage(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export const metadata = {
  title: "Website Media",
};

export default async function WebsiteMediaPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getDashboardSessionContext();
  if (!context) {
    return (
      <DashboardPage title="Media">
        <UnauthorizedState message="Sign in to manage website media." />
      </DashboardPage>
    );
  }

  const { websiteId } = await params;
  const query = await searchParams;
  const request = createDashboardRequest(context);
  const detail = await getWebsiteDetail({ database, request, websiteId });
  let assets: Awaited<ReturnType<typeof listWebsiteMediaAssets>>;
  try {
    assets = await listWebsiteMediaAssets({ database, includeArchived: true, request, websiteId });
  } catch (error) {
    if (error instanceof MediaDomainError) {
      return (
        <DashboardPage
          description="Enable the Media module before managing website media."
          title={`${detail.website.name} Media`}
        >
          <WebsiteNavigation
            active="media"
            productionUrl={detail.website.productionUrl}
            websiteId={websiteId}
            websiteName={detail.website.name}
          />

          <EmptyState description={error.message} title="Media unavailable" />
        </DashboardPage>
      );
    }

    throw error;
  }

  async function registerMedia(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;

    try {
      await registerWebsiteMediaAsset({
        database,
        input: {
          altText: formString(formData, "altText"),
          fileSize: formNumber(formData, "fileSize"),
          filename: formString(formData, "filename"),
          height: formNumber(formData, "height"),
          mimeType: formString(formData, "mimeType"),
          publicUrl: formString(formData, "publicUrl"),
          width: formNumber(formData, "width"),
        },
        request: createDashboardRequest(actionContext),
        websiteId,
      });
      revalidatePath(`/websites/${websiteId}/media`);
    } catch (error) {
      const message =
        error instanceof MediaDomainError ? error.message : "Media asset could not be registered.";
      redirectWithError(websiteId, message);
    }
  }

  async function updateMedia(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;

    try {
      await updateWebsiteMediaAsset({
        database,
        input: {
          altText: formString(formData, "altText"),
          filename: formString(formData, "filename"),
        },
        mediaAssetId: formString(formData, "mediaAssetId"),
        request: createDashboardRequest(actionContext),
        websiteId,
      });
      revalidatePath(`/websites/${websiteId}/media`);
    } catch (error) {
      const message =
        error instanceof MediaDomainError ? error.message : "Media asset could not be updated.";
      redirectWithError(websiteId, message);
    }
  }

  async function lifecycleMedia(formData: FormData) {
    "use server";
    const actionContext = await getDashboardSessionContext();
    if (!actionContext) return;

    try {
      const action = formString(formData, "action");
      const mediaAssetId = formString(formData, "mediaAssetId");
      if (action === "archive") {
        await archiveWebsiteMediaAsset({
          database,
          mediaAssetId,
          request: createDashboardRequest(actionContext),
          websiteId,
        });
      } else if (action === "restore") {
        await restoreWebsiteMediaAsset({
          database,
          mediaAssetId,
          request: createDashboardRequest(actionContext),
          websiteId,
        });
      }
      revalidatePath(`/websites/${websiteId}/media`);
    } catch (error) {
      const message =
        error instanceof MediaDomainError ? error.message : "Media lifecycle could not be updated.";
      redirectWithError(websiteId, message);
    }
  }

  const activeCount = assets.filter((asset) => !asset.deletedAt).length;

  return (
    <DashboardPage
      description="Register externally stored public media for this connected website."
      title={`${detail.website.name} Media`}
    >
      <WebsiteNavigation
        active="media"
        productionUrl={detail.website.productionUrl}
        websiteId={websiteId}
        websiteName={detail.website.name}
      />

      {errorMessage(query.error) ? (
        <Card className="border-error">
          <CardContent className="p-4 text-sm text-error">{errorMessage(query.error)}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Register Public Media Asset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <p className="text-sm text-muted-foreground">
            This registers metadata for a file already hosted at a public HTTP/HTTPS URL. It does
            not upload binary files.
          </p>
          <form action={registerMedia} className="grid gap-3 lg:grid-cols-3">
            <Field label="Filename" name="filename" required />
            <Field label="MIME Type" name="mimeType" placeholder="image/jpeg" required />
            <Field label="Public URL" name="publicUrl" required />
            <Field label="Alt Text" name="altText" />
            <Field label="Width" name="width" type="number" />
            <Field label="Height" name="height" type="number" />
            <Field label="File Size" name="fileSize" type="number" />
            <Button className="lg:col-span-3" type="submit">
              Register Media
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4">
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span>Assets</span>
            <Badge variant={activeCount > 0 ? "success" : "outline"}>{activeCount} active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No media assets are registered for this website yet.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => {
                const url = resolvePublicMediaUrl(asset);
                const dimensions = resolvePublicMediaDimensions(asset);
                const archived = Boolean(asset.deletedAt);

                return (
                  <article className="rounded-md border border-border p-3" key={asset.id}>
                    <div className="aspect-video overflow-hidden rounded-md bg-muted">
                      {url && asset.mimeType.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={asset.altText ?? ""}
                          className="size-full object-cover"
                          src={url}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{asset.filename}</p>
                        <Badge variant={archived ? "outline" : "success"}>
                          {archived ? "Archived" : "Active"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {asset.mimeType}
                        {dimensions.width && dimensions.height
                          ? ` · ${String(dimensions.width)}x${String(dimensions.height)}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDashboardDateTime(asset.createdAt)}
                      </p>
                      <form action={updateMedia} className="space-y-2">
                        <input name="mediaAssetId" type="hidden" value={asset.id} />
                        <Field label="Display Filename" name="filename" value={asset.filename} />
                        <Field label="Alt Text" name="altText" value={asset.altText ?? ""} />
                        <Button className="w-full" size="sm" type="submit" variant="outline">
                          Save Metadata
                        </Button>
                      </form>
                      <form action={lifecycleMedia}>
                        <input name="mediaAssetId" type="hidden" value={asset.id} />
                        <Button
                          className="w-full"
                          name="action"
                          size="sm"
                          type="submit"
                          value={archived ? "restore" : "archive"}
                          variant={archived ? "outline" : "destructive"}
                        >
                          {archived ? "Restore" : "Archive"}
                        </Button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardPage>
  );
}

function redirectWithError(websiteId: string, message: string): never {
  const encoded = encodeURIComponent(message);
  redirect(`/websites/${websiteId}/media?error=${encoded}`);
}

function Field({
  label,
  name,
  placeholder,
  required,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  return (
    <div>
      <Label htmlFor={`${name}-${label}`}>{label}</Label>
      <Input
        defaultValue={value}
        id={`${name}-${label}`}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}
