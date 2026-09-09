import { Command } from "commander";
import { scanDirectory } from "./scanner/index.js";

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
    console.log(`Scanning: ${dirPath}`);
    console.log(`Task: ${options.task}`);

    const files = await scanDirectory(dirPath);

    console.log(`\nFiles found: ${files.length}`);
    for (const file of files) {
      console.log(` ${file.path} (${file.size} bytes, ~${file.tokens} tokens)`);
    }
  });

program.parse();
