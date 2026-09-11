#!/usr/bin/env node

// ─── Nuvanta Context Guard ────────────────────────────────────────────────────
// CLI entry point. Defines the `scan` and `init` commands.
//
// Pipeline:
//   loadConfig → scanProject → secret filter → keyword scoring
//   → AI scoring → select → output

import "dotenv/config";
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";

import { scanProject } from "./scanner/index.js";
import { extractKeywords, scoreFile, scoreContent } from "./relevance/index.js";
import { selectFiles, type ScoredFile } from "./budget/index.js";
import { printReport } from "./output/index.js";
import { scoreFilesWithAI } from "./ai/index.js";
import { loadConfig, resolveOptions, generateConfig } from "./config/index.js";

const program = new Command();

program
  .name("nuvanta")
  .description("AI context management for developer projects")
  .version("0.1.2");

// ─── init ─────────────────────────────────────────────────────────────────────
// Generates a default nuvanta.config.json in the target directory.
//
// Usage:
//   nuvanta init <path>
//   nuvanta init .

program
  .command("init")
  .description("Generate a nuvanta.config.json in the target directory")
  .argument("[path]", "Path to the project directory", ".")
  .action(async (dirPath) => {
    try {
      const resolved = path.resolve(dirPath);
      const configPath = await generateConfig(resolved);
      console.log(`\nCreated: ${configPath}\n`);
    } catch (error) {
      console.error(`\nError: ${(error as Error).message}\n`);
      process.exit(1);
    }
  });

// ─── scan ─────────────────────────────────────────────────────────────────────
// Scans a project directory and returns the most relevant files for a given task
// within a token budget. CLI flags override nuvanta.config.json values.
//
// Usage:
//   nuvanta scan <path>
//   nuvanta scan <path> --task "..." --budget 10000 --no-ai

program
  .command("scan")
  .description("Scan a project and find relevant files for a task")
  .argument("<path>", "Path to the project directory")
  .option("--task <task>", "The task you are working on")
  .option("--budget <number>", "Max token budget")
  .option("--no-ai", "Skip Gemini AI scoring")
  .action(async (dirPath, options) => {
    try {
      const resolved = path.resolve(dirPath);

      // step 1: load config — CLI flags override
      const config = await loadConfig(resolved);
      const opts = resolveOptions(config, {
        task: options.task,
        budget: options.budget,
        ai: options.ai,
      });

      if (!opts.task) {
        console.error(
          '\nError: No task provided. Use --task "your task" or set "task" in nuvanta.config.json\n',
        );
        process.exit(1);
      }

      // step 2: scan all files
      const files = await scanProject(resolved);

      // step 3: exclude files with hardcoded secrets
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

      // step 4: apply config ignore rules on top of .nuvantaignore
      const configIgnore = new Set(opts.ignore);
      const filteredFiles = safeFiles.filter((file) => {
        const name = path.basename(file.path);
        const ext = path.extname(file.path);
        return !configIgnore.has(name) && !configIgnore.has(ext);
      });

      // step 5: keyword scoring
      const keywords = extractKeywords(opts.task);
      const scored: ScoredFile[] = [];

      for (const file of filteredFiles) {
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

      // step 6: AI scoring (Gemini) — skipped if opts.ai is false
      if (opts.ai && scored.length > 0) {
        const candidates = scored.map((f) => f.path);
        const aiScores = await scoreFilesWithAI(opts.task, candidates);

        for (const file of scored) {
          const aiScore = aiScores[file.path] ?? 0;
          if (aiScore > 0) {
            file.score += aiScore;
            file.reason.push(`AI flagged as relevant (${aiScore.toFixed(2)})`);
          }
        }

        scored.sort((a, b) => b.score - a.score);
      }

      // step 7: select within token budget
      const selected = selectFiles(scored, opts.budget);

      // step 8: output
      printReport({
        task: opts.task,
        keywords,
        budget: opts.budget,
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
