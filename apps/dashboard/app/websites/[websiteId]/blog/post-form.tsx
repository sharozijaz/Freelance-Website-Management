import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@agency/ui";
import type { BlogContentDocument } from "@agency/database/schema";
import { MarkdownEditor } from "./markdown-editor";

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
}

interface BlogPostForForm {
  canonicalUrl: string | null;
  categories: { category: TaxonomyItem }[];
  content: BlogContentDocument;
  excerpt: string;
  featuredMediaId: string | null;
  id: string;
  metaDescription: string | null;
  robotsFollow: boolean;
  robotsIndex: boolean;
  seoTitle: string | null;
  slug: string;
  status: string;
  tags: { tag: TaxonomyItem }[];
  title: string;
}

interface MediaOption {
  altText: string | null;
  filename: string;
  id: string;
  metadata: Record<string, unknown>;
}

export function BlogPostForm({
  action,
  categories,
  error,
  media,
  post,
  returnTo,
  tags,
}: {
  action: string;
  categories: TaxonomyItem[];
  error: string | null;
  media: MediaOption[];
  post?: BlogPostForForm;
  returnTo: string;
  tags: TaxonomyItem[];
}) {
  const selectedCategories = new Set(post?.categories.map((item) => item.category.id) ?? []);
  const selectedTags = new Set(post?.tags.map((item) => item.tag.id) ?? []);

  return (
    <form action={action} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]" method="post">
      <input name="returnTo" type="hidden" value={returnTo} />
      <section className="space-y-4">
        {error ? (
          <Card className="border-error">
            <CardContent className="p-4 text-sm text-error">{error}</CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <Field label="Title" name="title" required value={post?.title} />
            <Field label="Slug" name="slug" value={post?.slug} />
            <TextArea label="Excerpt" name="excerpt" rows={3} value={post?.excerpt} />
            <MarkdownEditor
              help="Formatted article content stored as portable markdown for connected websites."
              label="Content"
              media={media.map((asset) => ({
                altText: asset.altText,
                filename: asset.filename,
                id: asset.id,
                publicUrl:
                  typeof asset.metadata.publicUrl === "string" ? asset.metadata.publicUrl : null,
              }))}
              name="content"
              storageKey={`blog-post-draft:${post?.id ?? action}`}
              value={post?.content.markdown}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <Field label="SEO Title" name="seoTitle" value={post?.seoTitle ?? undefined} />
            <TextArea
              label="Meta Description"
              name="metaDescription"
              rows={3}
              value={post?.metaDescription ?? undefined}
            />
            <Field
              label="Canonical URL"
              name="canonicalUrl"
              value={post?.canonicalUrl ?? undefined}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                defaultChecked={post?.robotsIndex ?? true}
                name="robotsIndex"
                type="checkbox"
              />
              Robots index
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                defaultChecked={post?.robotsFollow ?? true}
                name="robotsFollow"
                type="checkbox"
              />
              Robots follow
            </label>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              Status
              {post ? <Badge variant="outline">{post.status}</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <Button className="w-full" name="action" type="submit" value="save">
              Save Draft
            </Button>
            {post ? (
              <>
                <Button
                  className="w-full"
                  name="action"
                  type="submit"
                  value="publish"
                  variant="primary"
                >
                  Publish
                </Button>
                <Button
                  className="w-full"
                  name="action"
                  type="submit"
                  value="unpublish"
                  variant="outline"
                >
                  Unpublish
                </Button>
                <Button
                  className="w-full"
                  name="action"
                  type="submit"
                  value="archive"
                  variant="outline"
                >
                  Archive
                </Button>
                <Button
                  className="w-full"
                  name="action"
                  type="submit"
                  value="delete"
                  variant="ghost"
                >
                  Delete
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Featured Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            <label className="block text-sm font-medium">
              Featured Media
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={post?.featuredMediaId ?? ""}
                name="featuredMediaId"
              >
                <option value="">No featured media</option>
                {media.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.filename}
                    {asset.altText ? ` - ${asset.altText}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {media.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active media is available for this website.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <TaxonomyField
          items={categories}
          name="categoryIds"
          selected={selectedCategories}
          title="Categories"
        />
        <TaxonomyField items={tags} name="tagIds" selected={selectedTags} title="Tags" />
      </aside>
    </form>
  );
}

function Field({
  help,
  label,
  name,
  required,
  value,
}: {
  help?: string;
  label: string;
  name: string;
  required?: boolean;
  value?: string | undefined;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        defaultValue={value}
        name={name}
        required={required}
      />
      {help ? <span className="mt-1 block text-xs text-muted-foreground">{help}</span> : null}
    </label>
  );
}

function TextArea({
  help,
  label,
  name,
  rows,
  value,
}: {
  help?: string;
  label: string;
  name: string;
  rows: number;
  value?: string | undefined;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <textarea
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        defaultValue={value}
        name={name}
        rows={rows}
      />
      {help ? <span className="mt-1 block text-xs text-muted-foreground">{help}</span> : null}
    </label>
  );
}

function TaxonomyField({
  items,
  name,
  selected,
  title,
}: {
  items: TaxonomyItem[];
  name: string;
  selected: Set<string>;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {title.toLowerCase()} yet.</p>
        ) : (
          items.map((item) => (
            <label className="flex items-center gap-2 text-sm" key={item.id}>
              <input
                defaultChecked={selected.has(item.id)}
                name={name}
                type="checkbox"
                value={item.id}
              />
              {item.name}
            </label>
          ))
        )}
      </CardContent>
    </Card>
  );
}
