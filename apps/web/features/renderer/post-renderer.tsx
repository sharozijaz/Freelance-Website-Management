import { ArticleLayout } from "../layouts";
import { StructuredData } from "./structured-data";
import type { PostRenderInput } from "./types";
import { postPathFromSlug } from "@/lib/routes";

export function PostRenderer(input: PostRenderInput) {
  return (
    <>
      <StructuredData
        content={input.post}
        pathname={postPathFromSlug(input.post.slug)}
        settings={input.context.settings}
      />
      <ArticleLayout {...input} />
    </>
  );
}
