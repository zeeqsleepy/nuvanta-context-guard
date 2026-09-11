import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printReport, type ReportOptions } from "./index.js";

const baseOptions: ReportOptions = {
  task: "fix login bug",
  keywords: ["login", "bug"],
  budget: 10000,
  totalFiles: 20,
  relevantFiles: 5,
  selected: [
    {
      path: "src/auth/login.ts",
      name: "login.ts",
      extension: ".ts",
      size: 400,
      tokens: 100,
      score: 2.5,
      reason: ['filename matches "login"', "AI flagged as relevant (0.90)"],
    },
    {
      path: "src/index.ts",
      name: "index.ts",
      extension: ".ts",
      size: 200,
      tokens: 50,
      score: 0.5,
      reason: ['content contains "login"'],
    },
  ],
};

let output: string;

beforeEach(() => {
  output = "";
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(console, "log").mockImplementation((...args) => {
    output += args.join(" ") + "\n";
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── report format ────────────────────────────────────────────────────────────

describe("report format (default)", () => {
  it("prints task and keywords", () => {
    printReport(baseOptions);
    expect(output).toContain("fix login bug");
    expect(output).toContain("login, bug");
  });

  it("prints file count summary", () => {
    printReport(baseOptions);
    expect(output).toContain("20");
    expect(output).toContain("5");
    expect(output).toContain("2");
  });

  it("prints each selected file path", () => {
    printReport(baseOptions);
    expect(output).toContain("src/auth/login.ts");
    expect(output).toContain("src/index.ts");
  });

  it("prints score and tokens per file", () => {
    printReport(baseOptions);
    expect(output).toContain("2.50");
    expect(output).toContain("100");
  });

  it("prints reason per file", () => {
    printReport(baseOptions);
    expect(output).toContain('filename matches "login"');
    expect(output).toContain("AI flagged as relevant");
  });

  it("prints token usage summary", () => {
    printReport(baseOptions);
    expect(output).toContain("150"); // 100 + 50
    expect(output).toContain("10,000");
  });

  it("prints no relevant files message when selected is empty", () => {
    printReport({ ...baseOptions, selected: [] });
    expect(output).toContain("No relevant files found");
  });

  it("uses report format when format is undefined", () => {
    printReport({ ...baseOptions, format: undefined });
    expect(output).toContain("Nuvanta Context Guard");
  });
});

// ─── json format ──────────────────────────────────────────────────────────────

describe("json format", () => {
  it("outputs valid JSON", () => {
    printReport({ ...baseOptions, format: "json" });
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("includes all top-level fields", () => {
    printReport({ ...baseOptions, format: "json" });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("task", "fix login bug");
    expect(parsed).toHaveProperty("keywords");
    expect(parsed).toHaveProperty("budget", 10000);
    expect(parsed).toHaveProperty("tokensUsed", 150);
    expect(parsed).toHaveProperty("tokensRemaining", 9850);
    expect(parsed).toHaveProperty("totalFiles", 20);
    expect(parsed).toHaveProperty("relevantFiles", 5);
    expect(parsed).toHaveProperty("selectedFiles");
  });

  it("includes correct file fields in selectedFiles", () => {
    printReport({ ...baseOptions, format: "json" });
    const parsed = JSON.parse(output);
    const first = parsed.selectedFiles[0];
    expect(first).toHaveProperty("path", "src/auth/login.ts");
    expect(first).toHaveProperty("score", 2.5);
    expect(first).toHaveProperty("tokens", 100);
    expect(first).toHaveProperty("reason");
    expect(first.reason).toContain('filename matches "login"');
  });

  it("outputs empty selectedFiles when nothing selected", () => {
    printReport({ ...baseOptions, format: "json", selected: [] });
    const parsed = JSON.parse(output);
    expect(parsed.selectedFiles).toEqual([]);
    expect(parsed.tokensUsed).toBe(0);
  });
});

// ─── markdown format ──────────────────────────────────────────────────────────

describe("markdown format", () => {
  it("starts with a markdown heading", () => {
    printReport({ ...baseOptions, format: "markdown" });
    expect(output).toContain("# Nuvanta Context Report");
  });

  it("includes task and keywords", () => {
    printReport({ ...baseOptions, format: "markdown" });
    expect(output).toContain("fix login bug");
    expect(output).toContain("login, bug");
  });

  it("includes summary table", () => {
    printReport({ ...baseOptions, format: "markdown" });
    expect(output).toContain("## Summary");
    expect(output).toContain("| Scanned |");
    expect(output).toContain("| Tokens used |");
  });

  it("includes selected files section", () => {
    printReport({ ...baseOptions, format: "markdown" });
    expect(output).toContain("## Selected Files");
    expect(output).toContain("src/auth/login.ts");
    expect(output).toContain("src/index.ts");
  });

  it("renders file paths as code in headings", () => {
    printReport({ ...baseOptions, format: "markdown" });
    expect(output).toContain("`src/auth/login.ts`");
  });

  it("shows no relevant files message when empty", () => {
    printReport({ ...baseOptions, format: "markdown", selected: [] });
    expect(output).toContain("No relevant files found");
  });
});
