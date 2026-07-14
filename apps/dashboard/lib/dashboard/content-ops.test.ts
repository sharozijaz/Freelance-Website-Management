import { describe, expect, it } from "vitest";
import {
  FormValidationError,
  getFormTemplateFields,
  getMediaType,
  normalizeFormField,
  parseFormFieldDefinitions,
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

  it("builds contact and catering form templates with stable public field names", () => {
    expect(getFormTemplateFields("contact").map((field) => field.name)).toEqual([
      "name",
      "email",
      "topic",
      "message",
    ]);

    expect(getFormTemplateFields("catering").map((field) => field.name)).toEqual([
      "name",
      "email",
      "phone",
      "eventDate",
      "guestCount",
      "serviceStyle",
      "notes",
    ]);

    expect(
      getFormTemplateFields("catering").find((field) => field.name === "serviceStyle"),
    ).toMatchObject({
      options: [
        { label: "Buffet", value: "buffet" },
        { label: "Boxed", value: "boxed" },
        { label: "Family style", value: "family-style" },
        { label: "Staffed", value: "staffed" },
      ],
    });
  });

  it("parses custom public form field definitions", () => {
    expect(
      parseFormFieldDefinitions(
        [
          "name | Name | text | required",
          "topic | Topic | select | required | general:General question,feedback:Feedback",
        ].join("\n"),
      ),
    ).toEqual([
      {
        helpText: null,
        label: "Name",
        name: "name",
        options: [],
        placeholder: null,
        required: true,
        type: "text",
      },
      {
        helpText: null,
        label: "Topic",
        name: "topic",
        options: [
          { label: "General question", value: "general" },
          { label: "Feedback", value: "feedback" },
        ],
        placeholder: null,
        required: true,
        type: "select",
      },
    ]);
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
