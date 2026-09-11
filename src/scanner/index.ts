// ─── Project Scanner ─────────────────────────────────────────────────────────
// Recursively walks a directory, filters irrelevant files, and detects secrets.
// Respects .nuvantaignore rules at the project root.

import fs from "fs/promises";
import path from "path";
import { detectSecrets, type SecretMatch } from "../secrets/index.js";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "build",
  "coverage",
  ".cache",
]);

const IGNORED_FILES = new Set([
  ".nuvantaignore",
  ".gitignore",
  ".prettierrc",
  ".eslintrc",
]);

const IGNORED_EXTENSIONS = new Set([
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
]);

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  tokens: number;
  secret?: SecretMatch[];
}

export interface IgnoreRules {
  exact: Set<string>; // exact filename or dir name match
  extensions: Set<string>; // extension match e.g. ".pem"
  wildcards: RegExp[]; // glob-style *.pem, .env.* converted to regex
}

// Converts a simple glob pattern to a RegExp.
// Supports * as wildcard only — no ** or ? for v0.1 simplicity.
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

// Reads .nuvantaignore from project root and returns structured ignore rules
async function loadIgnoreRules(rootPath: string): Promise<IgnoreRules> {
  const ignorePath = path.join(rootPath, ".nuvantaignore");
  const rules: IgnoreRules = {
    exact: new Set(),
    extensions: new Set(),
    wildcards: [],
  };

  try {
    const content = await fs.readFile(ignorePath, "utf-8");
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    for (const line of lines) {
      const rule = line.endsWith("/") ? line.slice(0, -1) : line; // strip trailing slash
      if (rule.startsWith("*.") && !rule.slice(2).includes("*")) {
        // *.pem → extension rule
        rules.extensions.add(rule.slice(1)); // store as ".pem"
      } else if (rule.includes("*")) {
        // any other wildcard → regex
        rules.wildcards.push(globToRegex(rule));
      } else {
        rules.exact.add(rule);
      }
    }
  } catch {
    // no .nuvantaignore — return empty rules
  }

  return rules;
}

// Checks whether a filename matches any ignore rule
function matchesIgnoreRules(
  name: string,
  ext: string,
  rules: IgnoreRules,
): boolean {
  if (rules.exact.has(name)) return true;
  // bare extension in exact set e.g. ".ts" added without asterisk
  if (ext && rules.exact.has(ext)) return true;
  if (rules.extensions.has(ext)) return true;
  if (rules.wildcards.some((re) => re.test(name))) return true;
  return false;
}

// Recursively scans a directory, applying ignore rules and secret detection
export async function scanDirectory(
  dirPath: string,
  ignoreRules: IgnoreRules = {
    exact: new Set(),
    extensions: new Set(),
    wildcards: [],
  },
): Promise<FileInfo[]> {
  const result: FileInfo[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (ignoreRules.exact.has(entry.name)) continue;
      result.push(...(await scanDirectory(fullPath, ignoreRules)));
      continue;
    }

    // file filtering — exact built-in lists first
    const ext = path.extname(entry.name);
    if (IGNORED_FILES.has(entry.name)) continue;
    if (IGNORED_EXTENSIONS.has(ext)) continue;

    // .env variants — catch .env.local, .env.production etc.
    if (entry.name === ".env" || entry.name.startsWith(".env.")) continue;

    // user ignore rules
    if (matchesIgnoreRules(entry.name, ext, ignoreRules)) continue;

    const stat = await fs.stat(fullPath);

    // detect secrets — skip binary files silently
    let secret: SecretMatch[] = [];
    try {
      const content = await fs.readFile(fullPath, "utf-8");
      secret = detectSecrets(content);
    } catch {}

    result.push({
      path: fullPath,
      name: entry.name,
      extension: ext,
      size: stat.size,
      tokens: Math.round(stat.size / 4),
      secret,
    });
  }

  return result;
}

// Entry point — loads ignore rules then scans from root
export async function scanProject(rootPath: string): Promise<FileInfo[]> {
  const ignoreRules = await loadIgnoreRules(rootPath);
  return scanDirectory(rootPath, ignoreRules);
}

export { loadIgnoreRules, matchesIgnoreRules };
