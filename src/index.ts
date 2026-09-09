import { Command } from "commander";
import { scanDirectory } from "./scanner/index.js";
import { extractKeywords, scoreFile, scoreContent } from "./relevance/index.js";
import { selectFiles } from "./budget/index.js";
import fs from "fs/promises";

const program = new Command();

program
  .name("nuvanta")
  .description("AI context management for developer projects")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan a project and find relevant files for a task")
  .argument("<path>", "Path to the project directory")
  .option("--task <task>", "The task you are working on")
  .option("--budget <number>", "Max token budget", "10000")
  .action(async (dirPath, options) => {
    const budget = parseInt(options.budget);
    const files = await scanDirectory(dirPath);
    const keywords = extractKeywords(options.task);

    console.log(`Task: ${options.task}`);
    console.log(`Keywords: ${keywords.join(", ")}`);
    console.log(`Budget: ${budget} tokens`);
    console.log(`Files found: ${files.length}\n`);

    const scored = [];

    for (const file of files) {
      const content = await fs.readFile(file.path, "utf-8");
      const score =
        scoreFile(file.path, keywords) + scoreContent(content, keywords);
      if (score > 0) {
        scored.push({ ...file, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const selected = selectFiles(scored, budget);
    const totalTokens = selected.reduce((sum, f) => sum + f.tokens, 0);

    console.log(`Relevant files: ${scored.length}`);
    console.log(`Selected: ${selected.length}`);
    console.log(`Context: ${totalTokens} / ${budget} tokens\n`);

    for (const file of selected) {
      console.log(` [${file.score}] ${file.path} (~${file.tokens} tokens)`);
    }
  });

program.parse();
