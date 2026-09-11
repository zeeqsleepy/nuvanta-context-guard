// ─── Config Loader ────────────────────────────────────────────────────────────
// Loads and validates nuvanta.config.json from the project root.
// All fields are optional — missing config is fine, defaults apply.

import fs from "fs/promises";
import path from "path";

export interface NuvantaConfig {
  task?: string;
  budget?: number;
  ignore?: string[];
  output?: "report" | "json" | "markdown";
  ai?: boolean;
}

const CONFIG_FILE = "nuvanta.config.json";

const DEFAULTS: Required<NuvantaConfig> = {
  task: "",
  budget: 10000,
  ignore: [],
  output: "report",
  ai: true,
};

// Validates that parsed JSON matches expected shape — logs warnings for bad fields
function validate(raw: unknown): NuvantaConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`${CONFIG_FILE} must be a JSON object`);
  }

  const obj = raw as Record<string, unknown>;
  const config: NuvantaConfig = {};

  if ("task" in obj) {
    if (typeof obj.task !== "string")
      throw new Error('"task" must be a string');
    config.task = obj.task;
  }

  if ("budget" in obj) {
    if (typeof obj.budget !== "number" || obj.budget <= 0) {
      throw new Error('"budget" must be a positive number');
    }
    config.budget = obj.budget;
  }

  if ("ignore" in obj) {
    if (
      !Array.isArray(obj.ignore) ||
      obj.ignore.some((x) => typeof x !== "string")
    ) {
      throw new Error('"ignore" must be an array of strings');
    }
    config.ignore = obj.ignore as string[];
  }

  if ("output" in obj) {
    if (!["report", "json", "markdown"].includes(obj.output as string)) {
      throw new Error('"output" must be "report", "json", or "markdown"');
    }
    config.output = obj.output as NuvantaConfig["output"];
  }

  if ("ai" in obj) {
    if (typeof obj.ai !== "boolean")
      throw new Error('"ai" must be true or false');
    config.ai = obj.ai;
  }

  return config;
}

// Loads config from project root — returns empty config if file not found
export async function loadConfig(projectRoot: string): Promise<NuvantaConfig> {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const raw = JSON.parse(content);
    return validate(raw);
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {}; // no config file — fine
    }
    throw new Error(`Invalid ${CONFIG_FILE}: ${(err as Error).message}`);
  }
}

// Merges config with CLI flags — CLI flags always win
export function resolveOptions(
  config: NuvantaConfig,
  cli: { task?: string; budget?: string; ai?: boolean },
): Required<NuvantaConfig> {
  return {
    task: cli.task ?? config.task ?? DEFAULTS.task,
    budget:
      cli.budget !== undefined
        ? parseInt(cli.budget)
        : (config.budget ?? DEFAULTS.budget),
    ignore: config.ignore ?? DEFAULTS.ignore,
    output: config.output ?? DEFAULTS.output,
    ai: cli.ai !== undefined ? cli.ai : (config.ai ?? DEFAULTS.ai),
  };
}

// Generates a default nuvanta.config.json at the given path
export async function generateConfig(projectRoot: string): Promise<string> {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  const template = {
    task: "",
    budget: 10000,
    ignore: [],
    output: "report",
    ai: true,
  };
  await fs.writeFile(
    configPath,
    JSON.stringify(template, null, 2) + "\n",
    "utf-8",
  );
  return configPath;
}
