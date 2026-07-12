import { buildStructuredData } from "@/lib/seo";
import type { PayloadPage, PayloadPost } from "@/lib/payload/types";

export function StructuredData({
  content,
  pathname,
  settings,
}: {
  content: PayloadPage | PayloadPost;
  pathname: string;
  settings?: Parameters<typeof buildStructuredData>[0]["settings"];
}) {
  const schema = buildStructuredData({ content, pathname, settings: settings ?? null });

  if (schema.length === 0) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": schema }),
      }}
      type="application/ld+json"
    />
  );
}
