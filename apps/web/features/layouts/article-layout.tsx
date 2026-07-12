import Image from "next/image";
import { Container, Heading, Section, Stack, Text } from "@agency/ui";
import { getMediaAlt, getMediaUrl, isMedia } from "@/lib/media";
import type { PostRenderInput } from "../renderer/types";

export function ArticleLayout({ post }: PostRenderInput) {
  const imageUrl = getMediaUrl(post.featuredImage);

  return (
    <main>
      <article>
        <Section>
          <Container>
            <Stack gap="lg">
              <Stack gap="sm">
                <Heading>{post.title}</Heading>
                {post.excerpt ? (
                  <Text className="text-muted-foreground">{post.excerpt}</Text>
                ) : null}
              </Stack>
              {imageUrl && isMedia(post.featuredImage) ? (
                <Image
                  alt={getMediaAlt(post.featuredImage)}
                  className="aspect-video w-full rounded-md object-cover"
                  height={post.featuredImage.height ?? 900}
                  src={imageUrl}
                  width={post.featuredImage.width ?? 1600}
                />
              ) : null}
              <Text className="text-muted-foreground">
                Rich text rendering will be connected when the portable content renderer is
                finalized.
              </Text>
            </Stack>
          </Container>
        </Section>
      </article>
    </main>
  );
}
