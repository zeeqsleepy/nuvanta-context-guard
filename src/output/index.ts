// ─── Report Output ───────────────────────────────────────────────────────────
// Formats and prints the final context report to stdout.
// Shows selected files with scores, token usage, and reasons for selection.

import { ScoredFile } from "../budget/index.js";

export interface ReportOptions {
  task: string;
  keywords: string[];
  budget: number;
  totalFiles: number;
  relevantFiles: number;
  selected: ScoredFile[];
}

export function printReport(options: ReportOptions): void {
  const { task, keywords, budget, totalFiles, relevantFiles, selected } =
    options;

  const divider = "─".repeat(48);
  const header = "═".repeat(48);

  console.log(`\n${header}`);
  console.log(`  Nuvanta Context Guard`);
  console.log(`${header}`);
  console.log(`  Task     : ${task ?? "(none)"}`);
  console.log(
    `  Keywords : ${keywords.length > 0 ? keywords.join(", ") : "(none)"}`,
  );
  console.log(`  Budget   : ${budget.toLocaleString()} tokens`);
  console.log(`${divider}`);
  console.log(`  Scanned  : ${totalFiles} files`);
  console.log(`  Relevant : ${relevantFiles} files`);
  console.log(`  Selected : ${selected.length} files`);
  console.log(`${header}\n`);

  if (selected.length === 0) {
    console.log(`  No relevant files found.\n`);
    return;
  }

  for (const file of selected) {
    console.log(`  ${file.path}`);
    console.log(`    score   : ${file.score.toFixed(2)}`);
    console.log(`    tokens  : ${file.tokens.toLocaleString()}`);
    console.log(`    reason  : ${file.reason.join(" | ")}`);
    console.log();
  }

  const used = selected.reduce((sum, f) => sum + f.tokens, 0);
  console.log(`${divider}`);
  console.log(
    `  Tokens used : ${used.toLocaleString()} / ${budget.toLocaleString()}`,
  );
  console.log(`  Remaining   : ${(budget - used).toLocaleString()}`);
  console.log(`${header}\n`);
}
