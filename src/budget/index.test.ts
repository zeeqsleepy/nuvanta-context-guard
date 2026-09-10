import { describe, it, expect } from "vitest";
import { selectFiles } from "./index.js";

describe("selectFiles", () => {
  it("selects files that fit within budget", () => {
    const files = [
      {
        path: "a.ts",
        name: "a.ts",
        extension: ".ts",
        size: 100,
        tokens: 100,
        score: 1,
      },
      {
        path: "b.ts",
        name: "b.ts",
        extension: ".ts",
        size: 100,
        tokens: 500,
        score: 0.5,
      },
    ];

    const result = selectFiles(files, 200);
    expect(result).toHaveLength(1);
  });

  it("return empty array when budget is 0", () => {
    const files = [
      {
        path: "a.ts",
        name: "a.ts",
        extension: ".ts",
        size: 100,
        tokens: 100,
        score: 1,
      },
    ];

    const result = selectFiles(files, 0);
    expect(result).toHaveLength(0);
  });

  it("selects all files when budget is large enough", () => {
    const files = [
      {
        path: "a.ts",
        name: "a.ts",
        extension: ".ts",
        size: 100,
        tokens: 100,
        score: 1,
      },
      {
        path: "b.ts",
        name: "b.ts",
        extension: ".ts",
        size: 100,
        tokens: 100,
        score: 0.5,
      },
    ];

    const result = selectFiles(files, 1000);
    expect(result).toHaveLength(2);
  });
});
