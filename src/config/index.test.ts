import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { loadConfig, resolveOptions, generateConfig } from "./index.js";

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "nuvanta-config-test-"));
}

async function writeConfig(dir: string, content: unknown): Promise<void> {
  await fs.writeFile(
    path.join(dir, "nuvanta.config.json"),
    JSON.stringify(content, null, 2),
    "utf-8",
  );
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await makeTempDir();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ─── loadConfig ───────────────────────────────────────────────────────────────

describe("loadConfig", () => {
  it("returns empty config when no config file exists", async () => {
    const config = await loadConfig(tmpDir);
    expect(config).toEqual({});
  });

  it("loads a valid config file", async () => {
    await writeConfig(tmpDir, { task: "fix login", budget: 5000 });
    const config = await loadConfig(tmpDir);
    expect(config.task).toBe("fix login");
    expect(config.budget).toBe(5000);
  });

  it("loads all supported fields", async () => {
    await writeConfig(tmpDir, {
      task: "refactor auth",
      budget: 8000,
      ignore: ["*.test.ts", "scripts/"],
      output: "json",
      ai: false,
    });
    const config = await loadConfig(tmpDir);
    expect(config.task).toBe("refactor auth");
    expect(config.budget).toBe(8000);
    expect(config.ignore).toEqual(["*.test.ts", "scripts/"]);
    expect(config.output).toBe("json");
    expect(config.ai).toBe(false);
  });

  it("throws on invalid JSON", async () => {
    await fs.writeFile(
      path.join(tmpDir, "nuvanta.config.json"),
      "not json",
      "utf-8",
    );
    await expect(loadConfig(tmpDir)).rejects.toThrow(
      "Invalid nuvanta.config.json",
    );
  });

  it("throws when budget is not a positive number", async () => {
    await writeConfig(tmpDir, { budget: -1 });
    await expect(loadConfig(tmpDir)).rejects.toThrow(
      '"budget" must be a positive number',
    );
  });

  it("throws when task is not a string", async () => {
    await writeConfig(tmpDir, { task: 123 });
    await expect(loadConfig(tmpDir)).rejects.toThrow('"task" must be a string');
  });

  it("throws when output is an invalid value", async () => {
    await writeConfig(tmpDir, { output: "xml" });
    await expect(loadConfig(tmpDir)).rejects.toThrow('"output" must be');
  });

  it("throws when ignore is not an array", async () => {
    await writeConfig(tmpDir, { ignore: "*.ts" });
    await expect(loadConfig(tmpDir)).rejects.toThrow(
      '"ignore" must be an array',
    );
  });

  it("throws when ai is not a boolean", async () => {
    await writeConfig(tmpDir, { ai: "yes" });
    await expect(loadConfig(tmpDir)).rejects.toThrow(
      '"ai" must be true or false',
    );
  });

  it("ignores unknown fields silently", async () => {
    await writeConfig(tmpDir, { task: "fix bug", unknownField: "ignored" });
    const config = await loadConfig(tmpDir);
    expect(config.task).toBe("fix bug");
    expect((config as Record<string, unknown>).unknownField).toBeUndefined();
  });
});

// ─── resolveOptions ───────────────────────────────────────────────────────────

describe("resolveOptions", () => {
  it("uses defaults when config and cli are empty", () => {
    const opts = resolveOptions({}, {});
    expect(opts.budget).toBe(10000);
    expect(opts.ai).toBe(true);
    expect(opts.output).toBe("report");
    expect(opts.ignore).toEqual([]);
    expect(opts.task).toBe("");
  });

  it("uses config values when cli flags are absent", () => {
    const opts = resolveOptions(
      { task: "fix auth", budget: 5000, ai: false },
      {},
    );
    expect(opts.task).toBe("fix auth");
    expect(opts.budget).toBe(5000);
    expect(opts.ai).toBe(false);
  });

  it("cli --task overrides config task", () => {
    const opts = resolveOptions({ task: "config task" }, { task: "cli task" });
    expect(opts.task).toBe("cli task");
  });

  it("cli --budget overrides config budget", () => {
    const opts = resolveOptions({ budget: 5000 }, { budget: "2000" });
    expect(opts.budget).toBe(2000);
  });

  it("cli --no-ai overrides config ai", () => {
    const opts = resolveOptions({ ai: true }, { ai: false });
    expect(opts.ai).toBe(false);
  });

  it("config ignore is preserved through resolve", () => {
    const opts = resolveOptions({ ignore: ["*.test.ts", "scripts/"] }, {});
    expect(opts.ignore).toEqual(["*.test.ts", "scripts/"]);
  });
});

// ─── generateConfig ───────────────────────────────────────────────────────────

describe("generateConfig", () => {
  it("creates nuvanta.config.json in the target directory", async () => {
    await generateConfig(tmpDir);
    const exists = await fs
      .access(path.join(tmpDir, "nuvanta.config.json"))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it("generated config is valid JSON", async () => {
    await generateConfig(tmpDir);
    const content = await fs.readFile(
      path.join(tmpDir, "nuvanta.config.json"),
      "utf-8",
    );
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it("generated config has all expected fields", async () => {
    await generateConfig(tmpDir);
    const content = await fs.readFile(
      path.join(tmpDir, "nuvanta.config.json"),
      "utf-8",
    );
    const parsed = JSON.parse(content);
    expect(parsed).toHaveProperty("task");
    expect(parsed).toHaveProperty("budget");
    expect(parsed).toHaveProperty("ignore");
    expect(parsed).toHaveProperty("output");
    expect(parsed).toHaveProperty("ai");
  });

  it("returns the path to the created file", async () => {
    const result = await generateConfig(tmpDir);
    expect(result).toContain("nuvanta.config.json");
  });
});
