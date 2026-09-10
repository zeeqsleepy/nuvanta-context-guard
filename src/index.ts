import { Command } from "commander";
import { scanDirectory } from "./scanner/index.js";
import { extractKeywords, scoreFile, scoreContent } from "./relevance/index.js";
import { selectFiles } from "./budget/index.js";
import { printReport } from "./output/index.js";
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
    try {
      const budget = parseInt(options.budget);
      const files = await scanDirectory(dirPath);
      const keywords = extractKeywords(options.task);

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
