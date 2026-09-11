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

// Reads .nuvantaignore from project root and returns rules as a Set
async function loadIgnoreRules(rootPath: string): Promise<Set<string>> {
  const ignorePath = path.join(rootPath, ".nuvantaignore");
  try {
    const content = await fs.readFile(ignorePath, "utf-8");
    const rules = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    return new Set(rules);
  } catch {
    return new Set();
  }
}

// Recursively scans a directory, applying ignore rules and secret detection
export async function scanDirectory(
  dirPath: string,
  ignoreRules: Set<string> = new Set(),
): Promise<FileInfo[]> {
  const result: FileInfo[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (ignoreRules.has(entry.name)) continue;
      result.push(...(await scanDirectory(fullPath, ignoreRules)));
      continue;
    }

    // file filtering
    const ext = path.extname(entry.name);
    if (IGNORED_FILES.has(entry.name)) continue;
    if (IGNORED_EXTENSIONS.has(ext)) continue;
    if (ignoreRules.has(entry.name)) continue;
    if (ignoreRules.has(ext)) continue;

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
