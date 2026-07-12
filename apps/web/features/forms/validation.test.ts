import { describe, expect, it } from "vitest";
import {
  WebsiteFormValidationError,
  normalizeFormDefinition,
  normalizeSubmissionData,
  validateSafeRedirect,
} from "./validation";

describe("website form normalization", () => {
  it("normalizes form definitions for rendering", () => {
    expect(
      normalizeFormDefinition({
        fields: [{ label: "Email", name: "email", required: true, type: "email" }],
        id: "form_1",
        name: "Contact",
      }),
    ).toMatchObject({
      fields: [{ label: "Email", name: "email", required: true, type: "email" }],
      id: "form_1",
    });
  });

  it("rejects invalid fields before rendering", () => {
    expect(() =>
      normalizeFormDefinition({
        fields: [{ label: "Upload", name: "upload", type: "file" }],
        id: "form_1",
      }),
    ).toThrow(WebsiteFormValidationError);
  });

  it("normalizes valid submissions", () => {
    expect(
      normalizeSubmissionData({
        fields: [{ name: "email", required: true, type: "email" }],
        payload: { _hp: "", email: "client@example.com", formId: "form_1" },
      }),
    ).toEqual({ email: "client@example.com" });
  });

  it("rejects unknown submitted fields", () => {
    expect(() =>
      normalizeSubmissionData({
        fields: [{ name: "email", required: true, type: "email" }],
        payload: { email: "client@example.com", unexpected: "value" },
      }),
    ).toThrow(WebsiteFormValidationError);
  });

  it("requires required values and safe redirects", () => {
    expect(() =>
      normalizeSubmissionData({
        fields: [{ name: "email", required: true, type: "email" }],
        payload: {},
      }),
    ).toThrow(WebsiteFormValidationError);
    expect(validateSafeRedirect("/thanks")).toBe("/thanks");
    expect(() => validateSafeRedirect("javascript:alert(1)")).toThrow(WebsiteFormValidationError);
  });
});
