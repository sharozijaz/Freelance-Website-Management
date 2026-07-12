import { describe, expect, it } from "vitest";
import { preparePageForSave } from "./pages";

type PreparePageForSaveArgs = Parameters<typeof preparePageForSave>[0];
type TestPreparePageForSaveArgs = PreparePageForSaveArgs & {
  data: {
    id: string;
    organizationId: string;
    previewUrl?: string;
    slug: string;
  };
};

function createHookArgs(totalDocs: number) {
  return {
    data: {
      id: "page_123",
      organizationId: "org_123",
      slug: "/services/",
    },
    operation: "create",
    originalDoc: null,
    req: {
      payload: {
        find: () => Promise.resolve({ totalDocs }),
      },
    },
  } as unknown as TestPreparePageForSaveArgs;
}

describe("page save workflow hooks", () => {
  it("normalizes slugs and creates a signed preview URL", async () => {
    const args = createHookArgs(0);

    await preparePageForSave(args);

    expect(args.data.previewUrl).toContain("/api/preview?token=");
    expect(args.data.slug).toBe("services");
  });

  it("rejects duplicate slugs inside the same organization", async () => {
    await expect(preparePageForSave(createHookArgs(1))).rejects.toThrow(
      'A page with slug "services" already exists for this organization.',
    );
  });

  it("rejects reserved route segments", async () => {
    await expect(
      preparePageForSave({
        ...createHookArgs(0),
        data: {
          id: "page_123",
          organizationId: "org_123",
          slug: "blog",
        },
      }),
    ).rejects.toThrow('"blog" is a reserved route segment.');
  });
});
