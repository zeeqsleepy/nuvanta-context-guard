import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { scanProject, scanDirectory } from "./index.js";

// Creates a temp directory and returns its path
async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "nuvanta-test-"));
}

// Writes a file inside a temp dir — creates subdirs as needed
async function writeFile(
  dir: string,
  relPath: string,
  content = "",
): Promise<string> {
  const fullPath = path.join(dir, relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf-8");
  return fullPath;
}

// ─────────────────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await makeTempDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ─── basic scanning ───────────────────────────────────────────────────────────

describe("scanProject", () => {
  it("returns an empty array for an empty directory", async () => {
    const result = await scanProject(tmpDir);
    expect(result).toEqual([]);
  });

  it("returns a scanned file with correct fields", async () => {
    await writeFile(tmpDir, "index.ts", "const x = 1;");
    const result = await scanProject(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("index.ts");
    expect(result[0].extension).toBe(".ts");
    expect(result[0].size).toBeGreaterThan(0);
    expect(result[0].tokens).toBeGreaterThan(0);
  });

  it("estimates tokens as roughly size / 4", async () => {
    const content = "a".repeat(400);
    await writeFile(tmpDir, "file.ts", content);
    const result = await scanProject(tmpDir);

    expect(result[0].tokens).toBe(100);
  });

  it("scans files in nested subdirectories", async () => {
    await writeFile(tmpDir, "src/auth/login.ts", "export function login() {}");
    await writeFile(tmpDir, "src/db/user.ts", "export const user = {}");
    const result = await scanProject(tmpDir);

    expect(result).toHaveLength(2);
    const names = result.map((f) => f.name);
    expect(names).toContain("login.ts");
    expect(names).toContain("user.ts");
  });
});

// ─── ignored directories ──────────────────────────────────────────────────────

describe("ignored directories", () => {
  const IGNORED = [
    "node_modules",
    ".git",
    "dist",
    ".next",
    "build",
    "coverage",
    ".cache",
  ];

  for (const dir of IGNORED) {
    it(`skips "${dir}" directory`, async () => {
      await writeFile(tmpDir, `${dir}/some-file.ts`, "const x = 1;");
      const result = await scanProject(tmpDir);
      expect(result).toEqual([]);
    });
  }

  it("still scans files outside ignored directories", async () => {
    await writeFile(tmpDir, "node_modules/pkg.ts", "");
    await writeFile(tmpDir, "src/app.ts", "const x = 1;");
    const result = await scanProject(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("app.ts");
  });
});

// ─── ignored files ────────────────────────────────────────────────────────────

describe("ignored files", () => {
  const IGNORED = [".nuvantaignore", ".gitignore", ".prettierrc", ".eslintrc"];

  for (const file of IGNORED) {
    it(`skips "${file}"`, async () => {
      await writeFile(tmpDir, file, "some content");
      const result = await scanProject(tmpDir);
      expect(result).toEqual([]);
    });
  }
});

// ─── ignored extensions ───────────────────────────────────────────────────────

describe("ignored extensions", () => {
  const IGNORED = [
    ".md",
    ".lock",
    ".env",
    ".log",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
  ];

  for (const ext of IGNORED) {
    it(`skips files with "${ext}" extension`, async () => {
      await writeFile(tmpDir, `somefile${ext}`, "content");
      const result = await scanProject(tmpDir);
      expect(result).toEqual([]);
    });
  }
});

// ─── .nuvantaignore ───────────────────────────────────────────────────────────

describe(".nuvantaignore", () => {
  it("ignores a file listed in .nuvantaignore", async () => {
    await writeFile(tmpDir, ".nuvantaignore", "secret.ts");
    await writeFile(tmpDir, "secret.ts", "const key = 'abc';");
    await writeFile(tmpDir, "index.ts", "const x = 1;");
    const result = await scanProject(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("index.ts");
  });

  it("ignores a directory listed in .nuvantaignore", async () => {
    await writeFile(tmpDir, ".nuvantaignore", "private");
    await writeFile(tmpDir, "private/config.ts", "const x = 1;");
    await writeFile(tmpDir, "src/index.ts", "const x = 1;");
    const result = await scanProject(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("index.ts");
  });

  it("ignores an extension listed in .nuvantaignore", async () => {
    await writeFile(tmpDir, ".nuvantaignore", ".ts");
    await writeFile(tmpDir, "app.ts", "const x = 1;");
    await writeFile(tmpDir, "app.js", "const x = 1;");
    const result = await scanProject(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("app.js");
  });

  it("ignores comment lines in .nuvantaignore", async () => {
    await writeFile(
      tmpDir,
      ".nuvantaignore",
      "# this is a comment\nignored.ts",
    );
    await writeFile(tmpDir, "ignored.ts", "const x = 1;");
    await writeFile(tmpDir, "kept.ts", "const y = 2;");
    const result = await scanProject(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("kept.ts");
  });

  it("works fine when .nuvantaignore does not exist", async () => {
    await writeFile(tmpDir, "index.ts", "const x = 1;");
    const result = await scanProject(tmpDir);
    expect(result).toHaveLength(1);
  });
});

// ─── secret detection ─────────────────────────────────────────────────────────

describe("secret detection in scanner", () => {
  it("attaches secret matches to files with secrets", async () => {
    await writeFile(tmpDir, "config.ts", `api_key = supersecretkey1234567890`);
    const result = await scanProject(tmpDir);

    expect(result[0].secret).toHaveLength(1);
    expect(result[0].secret![0].pattern).toBe("API Key (generic)");
  });

  it("returns empty secret array for clean files", async () => {
    await writeFile(tmpDir, "index.ts", "const x = 1;");
    const result = await scanProject(tmpDir);

    expect(result[0].secret).toEqual([]);
  });
});
