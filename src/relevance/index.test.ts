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
  it("returns score 1 when filename matches keyword", () => {
    const result = scoreFile("src/auth/login.ts", ["login"]);
    expect(result.score).toBe(1);
  });

  it("includes reason when filename matches", () => {
    const result = scoreFile("src/auth/login.ts", ["login"]);
    expect(result.reason).toContain('filename matches "login"');
  });

  it("returns score 0.6 when directory matches keyword", () => {
    const result = scoreFile("src/auth/register.ts", ["auth"]);
    expect(result.score).toBe(0.6);
  });

  it("includes reason when directory matches", () => {
    const result = scoreFile("src/auth/register.ts", ["auth"]);
    expect(result.reason).toContain('directory matches "auth"');
  });

  it("returns score 0 when no match", () => {
    const result = scoreFile("src/auth/register.ts", ["login"]);
    expect(result.score).toBe(0);
  });

  it("returns empty reason when no match", () => {
    const result = scoreFile("src/auth/register.ts", ["login"]);
    expect(result.reason).toEqual([]);
  });
});

describe("scoreContent", () => {
  it("returns score 0.5 when content matches keyword", () => {
    const result = scoreContent("the user clicks the login button", ["login"]);
    expect(result.score).toBe(0.5);
  });

  it("includes reason when content matches", () => {
    const result = scoreContent("the user clicks the login button", ["login"]);
    expect(result.reason).toContain('content contains "login"');
  });

  it("returns score 0 when no match", () => {
    const result = scoreContent("the user clicks the register button", [
      "login",
    ]);
    expect(result.score).toBe(0);
  });

  it("returns empty reason when no match", () => {
    const result = scoreContent("the user clicks the register button", [
      "login",
    ]);
    expect(result.reason).toEqual([]);
  });
});
