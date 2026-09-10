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

export function extractKeywords(task: string): string[] {
  return task
    .toLowerCase()
    .split(" ")
    .filter((word) => !STOP_WORDS.has(word));
}

export function scoreFile(filePath: string, keywords: string[]): number {
  const fileName = path.basename(filePath).toLowerCase();
  const dirName = path.dirname(filePath).toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (fileName.includes(keyword)) {
      score += 1.0;
    }
    if (dirName.includes(keyword)) {
      score += 0.6;
    }
  }

  return score;
}

export function scoreContent(content: string, keywords: string[]): number {
  const normalizedContent = content.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (normalizedContent.includes(keyword)) {
      score += 0.5;
    }
  }

  return score;
}
