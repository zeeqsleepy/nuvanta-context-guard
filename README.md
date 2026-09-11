# Nuvanta Context Guard

A developer tool that scans a software project, identifies files relevant to a task, and produces a context report for AI coding agents.

## Installation

```bash
npm install -g nuvanta-context-guard
```

## Commands

### `nuvanta scan`

Scans a project and returns the most relevant files for a given task within a token budget.

```bash
nuvanta scan <path> --task <task> [--budget <tokens>] [--output <format>] [--no-ai]
```

| Flag       | Description                                 | Default      |
| ---------- | ------------------------------------------- | ------------ |
| `--task`   | The task you are working on                 | _(required)_ |
| `--budget` | Max token budget                            | `10000`      |
| `--output` | Output format: `report`, `json`, `markdown` | `report`     |
| `--no-ai`  | Skip Gemini AI scoring                      | `false`      |

### `nuvanta init`

Generates a `nuvanta.config.json` in the target directory.

```bash
nuvanta init <path>
nuvanta init .
```

## Configuration

Create a `nuvanta.config.json` at your project root to set defaults. CLI flags always override config values.

```json
{
  "task": "fix login bug",
  "budget": 10000,
  "ignore": ["*.test.ts", "scripts/"],
  "output": "report",
  "ai": true
}
```

| Field    | Type     | Description                                            |
| -------- | -------- | ------------------------------------------------------ |
| `task`   | string   | Default task for this project                          |
| `budget` | number   | Default token budget                                   |
| `ignore` | string[] | Additional ignore rules (merged with `.nuvantaignore`) |
| `output` | string   | Default output format                                  |
| `ai`     | boolean  | Enable or disable Gemini AI scoring                    |

## Examples

Scan with a task:

```bash
nuvanta scan ./my-project --task "fix login button"
```

Scan with a token budget:

```bash
nuvanta scan ./my-project --task "fix login button" --budget 5000
```

Output as JSON (pipe to file or another tool):

```bash
nuvanta scan ./my-project --task "fix login button" --output json > context.json
```

Output as Markdown (paste into AI chat):

```bash
nuvanta scan ./my-project --task "fix login button" --output markdown
```

Skip AI scoring for faster local-only scan:

```bash
nuvanta scan ./my-project --task "fix login button" --no-ai
```

Generate a config file:

```bash
nuvanta init ./my-project
```

## Example Output

### report (default)

```
════════════════════════════════════════════════
  Nuvanta Context Guard
════════════════════════════════════════════════
  Task     : fix login button
  Keywords : login, button
  Budget   : 10,000 tokens
────────────────────────────────────────────────
  Scanned  : 24 files
  Relevant : 5 files
  Selected : 4 files
════════════════════════════════════════════════

  src/auth/login.ts
    score   : 2.60
    tokens  : 820
    reason  : filename matches "login" | content contains "login" | AI flagged as relevant (1.00)

  src/components/LoginButton.tsx
    score   : 2.10
    tokens  : 612
    reason  : filename matches "login" | filename matches "button" | AI flagged as relevant (0.90)

────────────────────────────────────────────────
  Tokens used : 1,432 / 10,000
  Remaining   : 8,568
════════════════════════════════════════════════
```

### json

```json
{
  "task": "fix login button",
  "keywords": ["login", "button"],
  "budget": 10000,
  "tokensUsed": 1432,
  "tokensRemaining": 8568,
  "totalFiles": 24,
  "relevantFiles": 5,
  "selectedFiles": [
    {
      "path": "src/auth/login.ts",
      "score": 2.6,
      "tokens": 820,
      "reason": ["filename matches \"login\"", "AI flagged as relevant (1.00)"]
    }
  ]
}
```

### markdown

Renders a formatted report with a summary table and file sections — paste directly into Claude, ChatGPT, or any AI chat.

## How It Works

1. **Config** — loads `nuvanta.config.json` from the project root if present; CLI flags override
2. **Scanner** — recursively discovers all files, respects `.nuvantaignore`, skips binaries and build artifacts
3. **Secret Guard** — detects hardcoded credentials and excludes those files from context
4. **Relevance Engine** — scores each file by filename, directory path, and content against your task keywords
5. **AI Scoring** — Gemini re-ranks candidates for deeper relevance judgment (disable with `--no-ai`)
6. **Budget Selector** — picks the highest-scored files that fit within the token limit
7. **Report** — outputs in your chosen format with score, token count, and reason per file

## Ignoring Files

Create a `.nuvantaignore` file at your project root to exclude files, directories, or extensions. Supports wildcards.

```
# directories
private/
infra/

# specific files
config.local.ts

# extensions
.test.ts

# wildcard patterns
*.pem
*.key
.env.*
```

The `ignore` field in `nuvanta.config.json` adds rules on top of `.nuvantaignore`.

## Secret Detection

Files containing hardcoded credentials are automatically skipped and a warning is printed:

```
[WARN] Skipped (secrets detected): src/config/keys.ts
       Line 3 - API Key (generic): api_key = sk-abc123...
```

Detected patterns include API keys, passwords, tokens, private key headers, AWS credentials, database URLs, and Bearer tokens.

`.env` and `.env.*` files (`.env.local`, `.env.production`, etc.) are always excluded regardless of ignore rules.

## Requirements

- Node.js 18+
- A Gemini API key (for AI scoring) — set `GEMINI_API_KEY` in your environment or a `.env` file

## License

MIT
