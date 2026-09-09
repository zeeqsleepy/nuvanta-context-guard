import fs from "fs/promises";
import path from "path";

export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
}

export async function scanDirectory(dirPath: string): Promise<FileInfo[]> {
  const result: FileInfo[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await scanDirectory(fullPath);
      result.push(...subFiles);
    } else {
      const stat = await fs.stat(fullPath);
      result.push({
        path: fullPath,
        name: entry.name,
        extension: path.extname(entry.name),
        size: stat.size,
      });
    }
  }
  return result;
}
