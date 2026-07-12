import { BlogLayout, DefaultLayout, LandingLayout } from "../layouts";
import { getPageLayout } from "./layout-registry";
import { StructuredData } from "./structured-data";
import type { PageRenderInput } from "./types";
import { pagePathFromSlug } from "@/lib/routes";

export function PageRenderer(input: PageRenderInput) {
  const layout = getPageLayout(input.page);

  return (
    <>
      <StructuredData
        content={input.page}
        pathname={pagePathFromSlug(input.page.slug)}
        settings={input.context.settings}
      />
      {layout === "landing" ? <LandingLayout {...input} /> : null}
      {layout === "blog" ? <BlogLayout {...input} /> : null}
      {layout === "default" ? <DefaultLayout {...input} /> : null}
    </>
  );
}
