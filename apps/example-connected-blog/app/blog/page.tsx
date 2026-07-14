import Link from "next/link";
import { createServerSharozClient } from "@/lib/sharoz";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const sharoz = createServerSharozClient();
  const posts = await sharoz.blog.posts.list({ limit: 10, page: 1 });

  return (
    <section>
      <h1>Blog</h1>
      <p className="muted">
        This page is rendered by a custom connected website using server-side @sharoz/sdk calls.
      </p>

      <div className="post-list">
        {posts.items.length === 0 ? (
          <p className="muted">No posts are available for this environment.</p>
        ) : (
          posts.items.map((post) => (
            <article className="post-card" key={post.id}>
              <p className="muted">{post.publishedAt ?? "Preview draft"}</p>
              <h2>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
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
            </article>
          ))
        )}
      </div>
    </section>
  );
}
