#!/usr/bin/env node

// --- Nuvanta MCP Server ------------------------------------------------------
// Exposes nuvanta scan as an MCP tool for Claude, Cursor, and other
// MCP-compatible clients.
//
// Usage in mcp.json / claude_desktop_config.json:
//
//   {
//     "mcpServers": {
//       "nuvanta": {
//         "command": "nuvanta-mcp",
//         "env": { "GEMINI_API_KEY": "your-key-here" }
//       }
//     }
//   }

import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";

import { scanProject } from "../scanner/index.js";
import {
  extractKeywords,
  scoreFile,
  scoreContent,
} from "../relevance/index.js";
import { selectFiles, type ScoredFile } from "../budget/index.js";
import { scoreFilesWithAI } from "../ai/index.js";
import { loadConfig, resolveOptions } from "../config/index.js";

const server = new Server(
  { name: "nuvanta-context-guard", version: "0.2.0" },
  { capabilities: { tools: {} } },
);

// --- tool list ----------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "scan_project",
      description:
        "Scan a project directory and return the most relevant files for a given task. " +
        "Files with hardcoded secrets are automatically excluded. " +
        "Returns file paths, scores, token counts, and reasons for selection.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absolute or relative path to the project directory",
          },
          task: {
            type: "string",
            description:
              "The task or goal — e.g. 'fix login bug', 'refactor auth module'",
          },
          budget: {
            type: "number",
            description: "Max token budget for selected files (default: 10000)",
          },
          ai: {
            type: "boolean",
            description: "Enable Gemini AI scoring (default: true)",
          },
        },
        required: ["path", "task"],
      },
    },
  ],
}));

// --- tool handler -------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "scan_project") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments as {
    path: string;
    task: string;
    budget?: number;
    ai?: boolean;
  };

  try {
    const resolved = path.resolve(args.path);

    // load config then resolve with tool arguments
    const config = await loadConfig(resolved);
    const opts = resolveOptions(config, {
      task: args.task,
      budget: args.budget !== undefined ? String(args.budget) : undefined,
      ai: args.ai,
    });

    // scan
    const files = await scanProject(resolved);

    // secret filter
    const safeFiles = files.filter((f) => !f.secret || f.secret.length === 0);
    const secretsFound = files.length - safeFiles.length;

    // keyword scoring
    const keywords = extractKeywords(opts.task);
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

    // AI scoring
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

    // budget selection
    const selected = selectFiles(scored, opts.budget);
    const tokensUsed = selected.reduce((sum, f) => sum + f.tokens, 0);

    // build response
    const result = {
      task: opts.task,
      keywords,
      budget: opts.budget,
      tokensUsed,
      tokensRemaining: opts.budget - tokensUsed,
      totalFiles: files.length,
      scannedFiles: safeFiles.length,
      secretsExcluded: secretsFound,
      relevantFiles: scored.length,
      selectedFiles: selected.map((f) => ({
        path: f.path,
        score: parseFloat(f.score.toFixed(2)),
        tokens: f.tokens,
        reason: f.reason,
      })),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${(err as Error).message}`,
        },
      ],
      isError: true,
    };
  }
});

// --- start -------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
