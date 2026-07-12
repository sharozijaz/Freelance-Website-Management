import NextLink from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Container, Section, Stack } from "@agency/ui";
import { getRecentPosts } from "@/lib/payload/queries";
import { postPathFromSlug } from "@/lib/routes";
import type { PageRenderInput } from "../renderer/types";

export async function BlogLayout({ context, page }: PageRenderInput) {
  const posts = await getRecentPosts({ organizationId: context.organizationId });

  return (
    <main>
      <Section>
        <Container>
          <Stack gap="lg">
            <h1 className="text-4xl font-semibold">{page.title}</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <CardTitle>
                      <NextLink href={postPathFromSlug(post.slug)}>{post.title}</NextLink>
                    </CardTitle>
                  </CardHeader>
                  {post.excerpt ? <CardContent>{post.excerpt}</CardContent> : null}
                </Card>
              ))}
            </div>
          </Stack>
        </Container>
      </Section>
    </main>
  );
}
