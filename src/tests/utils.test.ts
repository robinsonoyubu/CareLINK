import { describe, it, expect } from "vitest";
import {
  getInitials,
  slugify,
  truncate,
  capitalize,
  humanizeRole,
  humanizeProfession,
  scoreToGrade,
} from "@/lib/utils";

describe("getInitials", () => {
  it("returns two-letter initials", () => {
    expect(getInitials("John Doe")).toBe("JD");
    expect(getInitials("Chidinma Okonkwo")).toBe("CO");
  });
  it("handles single name", () => {
    expect(getInitials("Admin")).toBe("A");
  });
});

describe("slugify", () => {
  it("converts to lowercase slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("Healthcare Staffing Nigeria!")).toBe("healthcare-staffing-nigeria");
  });
});

describe("truncate", () => {
  it("truncates long text", () => {
    expect(truncate("Hello World", 5)).toBe("Hello…");
  });
  it("leaves short text unchanged", () => {
    expect(truncate("Hi", 10)).toBe("Hi");
  });
});

describe("capitalize", () => {
  it("capitalizes first letter", () => {
    expect(capitalize("nurse")).toBe("Nurse");
  });
});

describe("humanizeRole", () => {
  it("maps roles to display names", () => {
    expect(humanizeRole("admin")).toBe("Administrator");
    expect(humanizeRole("professional")).toBe("Healthcare Professional");
    expect(humanizeRole("client")).toBe("Home-Care Client");
  });
});

describe("humanizeProfession", () => {
  it("maps profession codes to display names", () => {
    expect(humanizeProfession("nurse_assistant")).toBe("Nurse Assistant");
    expect(humanizeProfession("physiotherapist")).toBe("Physiotherapist");
  });
});

describe("scoreToGrade", () => {
  it("returns correct grades", () => {
    expect(scoreToGrade(95)).toBe("A+");
    expect(scoreToGrade(85)).toBe("A");
    expect(scoreToGrade(45)).toBe("F");
  });
});
