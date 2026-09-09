import { Command } from "commander";
import { scanDirectory } from "./scanner/index.js";
import { extractKeywords, scoreFile } from "./relevance/index.js";

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
  .action(async (dirPath, options) => {
    const files = await scanDirectory(dirPath);
    const keywords = extractKeywords(options.task);

    console.log(`Task: ${options.task}`);
    console.log(`Keywords: ${keywords.join(", ")}`);
    console.log(`Files found: ${files.length}\n`);

    const scored = files
      .map((file) => ({ ...file, score: scoreFile(file.path, keywords) }))
      .filter((file) => file.score > 0)
      .sort((a, b) => b.score - a.score);

    console.log(`Relevant files: ${scored.length}`);
    for (const file of scored) {
      console.log(` [${file.score}] ${file.path} (~${file.tokens} tokens)`);
    }
  });

program.parse();
