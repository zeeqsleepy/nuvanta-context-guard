// ─── Report Output ────────────────────────────────────────────────────────────
// Formats and prints the final context report to stdout.
// Supports three output formats: report (default), json, markdown.

import { ScoredFile } from "../budget/index.js";

export interface ReportOptions {
  task: string;
  keywords: string[];
  budget: number;
  totalFiles: number;
  relevantFiles: number;
  selected: ScoredFile[];
  format?: "report" | "json" | "markdown";
}

// ─── report (default) ─────────────────────────────────────────────────────────

export function printReport(options: ReportOptions): void {
  const format = options.format ?? "report";

  if (format === "json") return printJson(options);
  if (format === "markdown") return printMarkdown(options);
  return printDefault(options);
}

function printDefault(options: ReportOptions): void {
  const { task, keywords, budget, totalFiles, relevantFiles, selected } =
    options;

  const divider = "─".repeat(48);
  const header = "═".repeat(48);
  const used = selected.reduce((sum, f) => sum + f.tokens, 0);

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

  console.log(`${divider}`);
  console.log(
    `  Tokens used : ${used.toLocaleString()} / ${budget.toLocaleString()}`,
  );
  console.log(`  Remaining   : ${(budget - used).toLocaleString()}`);
  console.log(`${header}\n`);
}

// ─── json ─────────────────────────────────────────────────────────────────────

function printJson(options: ReportOptions): void {
  const { task, keywords, budget, totalFiles, relevantFiles, selected } =
    options;
  const used = selected.reduce((sum, f) => sum + f.tokens, 0);

  const output = {
    task,
    keywords,
    budget,
    tokensUsed: used,
    tokensRemaining: budget - used,
    totalFiles,
    relevantFiles,
    selectedFiles: selected.map((f) => ({
      path: f.path,
      score: parseFloat(f.score.toFixed(2)),
      tokens: f.tokens,
      reason: f.reason,
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

// ─── markdown ─────────────────────────────────────────────────────────────────

function printMarkdown(options: ReportOptions): void {
  const { task, keywords, budget, totalFiles, relevantFiles, selected } =
    options;
  const used = selected.reduce((sum, f) => sum + f.tokens, 0);

  const lines: string[] = [];

  lines.push(`# Nuvanta Context Report`);
  lines.push(``);
  lines.push(`**Task:** ${task ?? "(none)"}`);
  lines.push(
    `**Keywords:** ${keywords.length > 0 ? keywords.join(", ") : "(none)"}`,
  );
  lines.push(`**Budget:** ${budget.toLocaleString()} tokens`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| Scanned | ${totalFiles} files |`);
  lines.push(`| Relevant | ${relevantFiles} files |`);
  lines.push(`| Selected | ${selected.length} files |`);
  lines.push(
    `| Tokens used | ${used.toLocaleString()} / ${budget.toLocaleString()} |`,
  );
  lines.push(`| Remaining | ${(budget - used).toLocaleString()} |`);
  lines.push(``);

  if (selected.length === 0) {
    lines.push(`_No relevant files found._`);
  } else {
    lines.push(`## Selected Files`);
    lines.push(``);

    for (const file of selected) {
      lines.push(`### \`${file.path}\``);
      lines.push(``);
      lines.push(`- **Score:** ${file.score.toFixed(2)}`);
      lines.push(`- **Tokens:** ${file.tokens.toLocaleString()}`);
      lines.push(`- **Reason:** ${file.reason.join(" | ")}`);
      lines.push(``);
    }
  }

  console.log(lines.join("\n"));
}
