import { FileInfo } from "../scanner/index.js";

export interface ScoredFile extends FileInfo {
  score: number;
}

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
