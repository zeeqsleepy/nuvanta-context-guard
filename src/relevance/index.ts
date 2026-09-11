// ─── Relevance Scoring ───────────────────────────────────────────────────────
// Scores files based on keyword matches in filename, directory path,
// and file content. Returns a numeric score and a reason list.

import path from "path";

const STOP_WORDS = new Set([
  "fix",
  "add",
  "update",
  "change",
  "make",
  "the",
  "a",
  "an",
  "is",
  "in",
  "for",
  "to",
]);

// Strips stop words and lowercases the task string into keywords
export function extractKeywords(task: string): string[] {
  if (!task) return [];
  return task
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

export interface FileScore {
  score: number;
  reason: string[];
}

// Scores a file by matching keywords against its filename and directory path
export function scoreFile(filePath: string, keywords: string[]): FileScore {
  const fileName = path.basename(filePath).toLowerCase();
  const dirName = path.dirname(filePath).toLowerCase();
  const reason: string[] = [];
  let score = 0;

  for (const keyword of keywords) {
    if (fileName.includes(keyword)) {
      score += 1.0;
      reason.push(`filename matches "${keyword}"`);
    }
    if (dirName.includes(keyword)) {
      score += 0.6;
      reason.push(`directory matches "${keyword}"`);
    }
  }

  return { score, reason };
}

// Scores a file by matching keywords against its content
export function scoreContent(content: string, keywords: string[]): FileScore {
  const normalized = content.toLowerCase();
  const reason: string[] = [];
  let score = 0;

  for (const keyword of keywords) {
    if (normalized.includes(keyword)) {
      score += 0.5;
      reason.push(`content contains "${keyword}"`);
    }
  }

  return { score, reason };
}
