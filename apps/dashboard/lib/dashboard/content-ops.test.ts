import { describe, expect, it } from "vitest";
import {
  FormValidationError,
  getMediaType,
  normalizeFormField,
  normalizeSubmissionData,
  validateSafeRedirect,
} from "./content-ops";

describe("content operations utilities", () => {
  it("normalizes supported form fields", () => {
    expect(normalizeFormField({ label: "Email Address", required: true, type: "email" })).toEqual({
      helpText: null,
      label: "Email Address",
      name: "email_address",
      options: [],
      placeholder: null,
      required: true,
      type: "email",
    });
  });

  it("rejects unsupported form fields", () => {
    expect(() => normalizeFormField({ label: "Name", type: "file" })).toThrow(FormValidationError);
  });

  it("validates select field options", () => {
    expect(
      normalizeFormField({
        label: "Topic",
        options: [{ label: "Sales", value: "sales" }],
        type: "select",
      }),
    ).toMatchObject({ options: [{ label: "Sales", value: "sales" }] });
    expect(() => normalizeFormField({ label: "Topic", type: "select" })).toThrow(
      FormValidationError,
    );
  });

  it("allowlists submission fields", () => {
    expect(
      normalizeSubmissionData({
        fields: [{ name: "email", required: true, type: "email" }],
        payload: { _hp: "", email: "client@example.com" },
      }),
    ).toEqual({ email: "client@example.com" });
  });

  it("rejects unknown submitted fields", () => {
    expect(() =>
      normalizeSubmissionData({
        fields: [{ name: "email", required: true, type: "email" }],
        payload: { email: "client@example.com", role: "admin" },
      }),
    ).toThrow(FormValidationError);
  });

  it("enforces required submission fields", () => {
    expect(() =>
      normalizeSubmissionData({
        fields: [{ name: "email", required: true, type: "email" }],
        payload: {},
      }),
    ).toThrow(FormValidationError);
  });

  it("validates safe redirects", () => {
    expect(validateSafeRedirect("/thanks")).toBe("/thanks");
    expect(validateSafeRedirect("https://example.com/thanks")).toBe("https://example.com/thanks");
    expect(() => validateSafeRedirect("http://example.com")).toThrow(FormValidationError);
    expect(() => validateSafeRedirect("//example.com")).toThrow(FormValidationError);
  });

  it("classifies media types", () => {
    expect(getMediaType("image/png")).toBe("image");
    expect(getMediaType("video/mp4")).toBe("video");
    expect(getMediaType("application/pdf")).toBe("pdf");
    expect(getMediaType("application/octet-stream")).toBe("other");
  });
});
