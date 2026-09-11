// ─── Budget Selection ────────────────────────────────────────────────────────
// Greedy selection of highest-scored files that fit within the token budget.
// Files are expected to be pre-sorted by score descending.

import { FileInfo } from "../scanner/index.js";

export interface ScoredFile extends FileInfo {
  score: number;
  reason: string[];
}

// Picks files in score order until the token budget is exhausted
export function selectFiles(files: ScoredFile[], budget: number): ScoredFile[] {
  const selected: ScoredFile[] = [];
  let remaining = budget;

  for (const file of files) {
    if (file.tokens <= remaining) {
      selected.push(file);
      remaining -= file.tokens;
    }
  }

  return selected;
}
