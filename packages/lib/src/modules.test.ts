import { describe, expect, it } from "vitest";
import {
  getDependentModuleKeys,
  getModuleDefinition,
  getModuleDependencies,
  isModuleAvailable,
  isKnownModuleKey,
  isWebsiteType,
  listModuleDefinitions,
  moduleKeys,
} from "./modules";

describe("first-party module registry", () => {
  it("lists all known module definitions", () => {
    expect(listModuleDefinitions().map((definition) => definition.key)).toEqual([...moduleKeys]);
  });

  it("looks up module definitions by key", () => {
    expect(getModuleDefinition("orders")).toMatchObject({
      availability: "planned",
      key: "orders",
      label: "Orders",
    });
  });

  it("separates available modules from planned roadmap modules", () => {
    expect(isModuleAvailable("blog")).toBe(true);
    expect(isModuleAvailable("forms")).toBe(true);
    expect(isModuleAvailable("media")).toBe(true);
    expect(isModuleAvailable("seo")).toBe(true);
    expect(isModuleAvailable("catalog")).toBe(false);
    expect(isModuleAvailable("orders")).toBe(false);
    expect(isModuleAvailable("customers")).toBe(false);
    expect(isModuleAvailable("booking")).toBe(false);
  });

  it("validates known module keys", () => {
    expect(isKnownModuleKey("orders")).toBe(true);
    expect(isKnownModuleKey("unknown")).toBe(false);
  });

  it("defines explicit order dependencies", () => {
    expect(getModuleDependencies("orders")).toEqual(["catalog", "customers"]);
    expect(getDependentModuleKeys("catalog")).toContain("orders");
    expect(getDependentModuleKeys("customers")).toContain("orders");
  });

  it("keeps blog and booking independent for now", () => {
    expect(getModuleDependencies("blog")).toEqual([]);
    expect(getModuleDependencies("booking")).toEqual([]);
  });
});

describe("website type registry", () => {
  it("validates canonical website types", () => {
    expect(isWebsiteType("wordpress")).toBe(true);
    expect(isWebsiteType("sharoz_connected")).toBe(true);
    expect(isWebsiteType("external_legacy")).toBe(true);
    expect(isWebsiteType("payload_template")).toBe(false);
  });
});
