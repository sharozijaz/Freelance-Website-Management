import { describe, expect, it } from "vitest";
import { createSearchHref, parseDashboardSearchParams } from "./filters";

describe("dashboard filters", () => {
  it("normalizes URL search parameters", () => {
    expect(
      parseDashboardSearchParams({
        page: "0",
        q: "  acme  ",
        sort: "name_asc",
        status: "active",
      }),
    ).toEqual({
      page: 1,
      query: "acme",
      sort: "name_asc",
      status: "active",
    });
  });

  it("creates shareable filtered URLs", () => {
    expect(
      createSearchHref(
        "/clients",
        { page: 1, query: "acme", sort: "updated_desc", status: "all" },
        { page: 2, status: "active" },
      ),
    ).toBe("/clients?q=acme&status=active&page=2");
  });
});
