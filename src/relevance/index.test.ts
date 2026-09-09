import { describe, it, expect } from "vitest";
import { extractKeywords, scoreFile, scoreContent } from "./index.js";

describe("extractKeywords", () => {
  it("removes stop words", () => {
    const result = extractKeywords("fix login button");
    expect(result).toEqual(["login", "button"]);
  });

  it("converts to lowercase", () => {
    const result = extractKeywords("Fix Login Button");
    expect(result).toEqual(["login", "button"]);
  });
});

describe("scoreFile", () => {
  it("returns 1 when filename matches keyword", () => {
    const score = scoreFile("src/auth/login.ts", ["login"]);
    expect(score).toBe(1);
  });

  it("returns 0 when no match", () => {
    const score = scoreFile("src/auth/register.ts", ["login"]);
    expect(score).toBe(0);
  });
});

describe("scoreContent", () => {
  it("returns 0.5 when content matches keyword", () => {
    const score = scoreContent("the user clicks the login button", ["login"]);
    expect(score).toBe(0.5);
  });

  it("returns 0 when no match", () => {
    const score = scoreContent("the user clicks the register button", [
      "login",
    ]);
    expect(score).toBe(0);
  });
});
