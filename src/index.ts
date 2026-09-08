import { Command } from "commander";

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
  .action((path, option) => {
    console.log("Path:", path);
    console.log("Task:", option.task);
  });

program.parse();
