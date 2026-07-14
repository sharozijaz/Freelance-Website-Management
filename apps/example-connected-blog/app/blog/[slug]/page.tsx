import Link from "next/link";
import { notFound } from "next/navigation";
import { isSharozApiError } from "@sharoz/sdk";
import { hasPreviewSession } from "@/lib/access";
import { createServerSharozClient } from "@/lib/sharoz";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const preview = await hasPreviewSession();
  const sharoz = createServerSharozClient();

  try {
    const { post } = await sharoz.blog.posts.getBySlug(slug, { preview });

    return (
      <article>
        <Link className="muted" href="/blog">
          Back to Blog
        </Link>
        <p className="muted">{post.publishedAt ?? "Preview draft"}</p>
        <h1>{post.title}</h1>
        <p>{post.excerpt}</p>
        <div className="metadata">
          {post.categories.map((category) => (
            <span className="pill" key={category.id}>
              {category.name}
            </span>
          ))}
          {post.tags.map((tag) => (
            <span className="pill" key={tag.id}>
              {tag.name}
            </span>
          ))}
        </div>
        <h2>Markdown source</h2>
        <pre className="markdown-source">{post.content.markdown}</pre>
      </article>
    );
  } catch (error) {
    if (isSharozApiError(error) && error.code === "NOT_FOUND") {
      notFound();
    }

    throw error;
  }
}
