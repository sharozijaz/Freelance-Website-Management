import { isSharozApiError } from "@sharoz/sdk";
import { createServerSharozClient } from "@/lib/sharoz";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const sharoz = createServerSharozClient();

  try {
    const media = await sharoz.media.list({ limit: 24, page: 1 });

    return (
      <section>
        <h1>Media</h1>
        <p className="muted">Public media metadata is loaded server-side through @sharoz/sdk.</p>

        <div className="post-list">
          {media.items.length === 0 ? (
            <p className="muted">No media assets are available for this environment.</p>
          ) : (
            media.items.map((asset) => (
              <article className="post-card" key={asset.id}>
                {asset.url && asset.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={asset.altText ?? asset.filename}
                    src={asset.url}
                    style={{ borderRadius: 12, height: "auto", maxWidth: "100%" }}
                  />
                ) : null}
                <h2>{asset.filename}</h2>
                <p>{asset.altText ?? "No alt text provided."}</p>
                <div className="metadata">
                  <span className="pill">{asset.mimeType}</span>
                  {asset.width && asset.height ? (
                    <span className="pill">
                      {asset.width} x {asset.height}
                    </span>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    );
  } catch (error) {
    if (isSharozApiError(error) && error.code === "MODULE_NOT_ENABLED") {
      return (
        <section>
          <h1>Media</h1>
          <p className="muted">The Media module is not enabled for this connected website.</p>
        </section>
      );
    }

    throw error;
  }
}
