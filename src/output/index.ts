import { ScoredFile } from "../budget/index.js";

export interface ReportData {
  task: string;
  keywords: string[];
  budget: number;
  totalFiles: number;
  relevantFiles: number;
  selected: ScoredFile[];
}

export function printReport(data: ReportData): void {
  const totalTokens = data.selected.reduce((sum, f) => sum + f.tokens, 0);
  const reduction = Math.round(
    (1 - data.selected.length / data.totalFiles) * 100
  );

  console.log("\nNuvanta Context Guard");
  console.log("─────────────────────────────────────\n");
  console.log(`Task: ${data.task}`);
  console.log(`Keywords: ${data.keywords.join(", ")}`);
  console.log(`Budget: ${data.budget} tokens\n`);
  console.log(`Files found: ${data.totalFiles}`);
  console.log(`Relevant: ${data.relevantFiles}`);
  console.log(`Selected: ${data.selected.length}`);
  console.log(`Context used: ${totalTokens} / ${data.budget} tokens`);
  console.log(`Reduction: ~${reduction}%\n`);
  console.log("Selected files:");

  for (const file of data.selected) {
    const tokens = `${file.tokens} tokens`.padStart(12);
    const score = `score ${file.score}`.padEnd(10);
    console.log(` ${file.path.padEnd(35)} ${tokens} ${score}`);
  }

  console.log("");
}
