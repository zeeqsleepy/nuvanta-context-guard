import fs from "fs/promises";
import path from "path";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".next",
  "build",
  "coverage",
  ".cache",
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
}

export async function scanDirectory(dirPath: string): Promise<FileInfo[]> {
  const result: FileInfo[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const subFiles = await scanDirectory(fullPath);
      result.push(...subFiles);
    } else {
      const ext = path.extname(entry.name);
      if (IGNORED_EXTENSIONS.has(ext)) continue;
      const stat = await fs.stat(fullPath);
      result.push({
        path: fullPath,
        name: entry.name,
        extension: path.extname(entry.name),
        size: stat.size,
        tokens: Math.round(stat.size / 4),
      });
    }
  }
  return result;
}
