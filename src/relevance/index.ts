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
  const normalizedPath = filePath.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (normalizedPath.includes(keyword)) {
      score += 1;
    }
  }

  return score;
}
