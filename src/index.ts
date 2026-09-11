#!/usr/bin/env node

// ─── Nuvanta Context Guard ────────────────────────────────────────────────────
// CLI entry point. Defines the `scan` command and orchestrates the full pipeline:
//   scanProject → secret filter → keyword scoring → AI scoring → select → report

import "dotenv/config";
import { Command } from "commander";
import fs from "fs/promises";

import { scanProject } from "./scanner/index.js";
import { extractKeywords, scoreFile, scoreContent } from "./relevance/index.js";
import { selectFiles, type ScoredFile } from "./budget/index.js";
import { printReport } from "./output/index.js";
import { scoreFilesWithAI } from "./ai/index.js";

const program = new Command();

program
  .name("nuvanta")
  .description("AI context management for developer projects")
  .version("0.1.0");

// ─── scan ─────────────────────────────────────────────────────────────────────
// Scans a project directory and returns the most relevant files for a given task
// within a token budget.
//
// Usage:
//   nuvanta scan <path> --task "..." --budget 10000

program
  .command("scan")
  .description("Scan a project and find relevant files for a task")
  .argument("<path>", "Path to the project directory")
  .option("--task <task>", "The task you are working on")
  .option("--budget <number>", "Max token budget", "10000")
  .action(async (dirPath, options) => {
    try {
      const budget = parseInt(options.budget);

      // step 1: scan all files
      const files = await scanProject(dirPath);

      // step 2: exclude files with hardcoded secrets
      const safeFiles = [];
      for (const file of files) {
        if (file.secret && file.secret.length > 0) {
          console.warn(`\n[WARN] Skipped (secrets detected): ${file.path}`);
          for (const s of file.secret) {
            console.warn(`       Line ${s.line} - ${s.pattern}: ${s.preview}`);
          }
        } else {
          safeFiles.push(file);
        }
      }

      // step 3: keyword scoring
      const keywords = extractKeywords(options.task);
      const scored: ScoredFile[] = [];

      for (const file of safeFiles) {
        const content = await fs.readFile(file.path, "utf-8");

        const fileResult = scoreFile(file.path, keywords);
        const contentResult = scoreContent(content, keywords);
        const score = fileResult.score + contentResult.score;

        if (score <= 0) continue;

        scored.push({
          ...file,
          score,
          reason: [...fileResult.reason, ...contentResult.reason],
        });
      }

      scored.sort((a, b) => b.score - a.score);

      // step 4: AI scoring (Gemini)
      if (scored.length > 0) {
        const candidates = scored.map((f) => f.path);
        const aiScores = await scoreFilesWithAI(options.task, candidates);

        for (const file of scored) {
          const aiScore = aiScores[file.path] ?? 0;
          if (aiScore > 0) {
            file.score += aiScore;
            file.reason.push(`AI flagged as relevant (${aiScore.toFixed(2)})`);
          }
        }

        scored.sort((a, b) => b.score - a.score);
      }

      // step 5: select within token budget
      const selected = selectFiles(scored, budget);

      // step 6: print report
      printReport({
        task: options.task,
        keywords,
        budget,
        totalFiles: files.length,
        relevantFiles: scored.length,
        selected,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        console.error(`\nError: Folder "${dirPath}" does not exist.\n`);
      } else if (error instanceof Error) {
        console.error(`\nError: ${error.message}\n`);
      } else {
        console.error("\nUnknown error.\n");
      }
      process.exit(1);
    }
  });

program.parse();
