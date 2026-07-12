import { describe, expect, it } from "vitest";
import {
  assertValidProjectTransition,
  getValidProjectTransitions,
  ProjectValidationError,
  validateFigmaUrl,
} from "./projects";

describe("project lifecycle", () => {
  it("allows controlled forward and operational backward transitions", () => {
    expect(getValidProjectTransitions("planning")).toContain("design");
    expect(getValidProjectTransitions("development")).toContain("design");
    expect(() => {
      assertValidProjectTransition("client_review", "ready_to_launch");
    }).not.toThrow();
  });

  it("rejects arbitrary lifecycle jumps", () => {
    expect(() => {
      assertValidProjectTransition("planning", "completed");
    }).toThrow(ProjectValidationError);
  });

  it("treats completed and cancelled projects as terminal", () => {
    expect(getValidProjectTransitions("completed")).toEqual([]);
    expect(getValidProjectTransitions("cancelled")).toEqual([]);
  });
});

describe("figma url validation", () => {
  it("allows Figma and FigJam URLs", () => {
    expect(validateFigmaUrl("https://www.figma.com/file/example")).toBe(
      "https://www.figma.com/file/example",
    );
    expect(validateFigmaUrl("https://figjam.com/file/example")).toBe(
      "https://figjam.com/file/example",
    );
  });

  it("rejects non-Figma URLs", () => {
    expect(() => validateFigmaUrl("https://example.com/file")).toThrow(ProjectValidationError);
  });
});
