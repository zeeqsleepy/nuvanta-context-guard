# Nuvanta Context Guard

A developer tool that scans a software project, identifies files relevant to a task, and produces a context report for AI coding agents.

## Installation

```bash
npm install -g nuvanta-context-guard
```

## Usage

```bash
nuvanta scan <path> --task <task> [--budget <tokens>]
```

## Examples

Scan a project for files relevant to fixing a login bug:

```bash
nuvanta scan ./my-project --task "fix login button"
```

Scan with a token budget:

```bash
nuvanta scan ./my-project --task "fix login button" --budget 5000
```

## Example Output

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

  src/api/auth.ts
    score   : 0.50
    tokens  : 445
    reason  : content contains "login"

  src/index.ts
    score   : 0.50
    tokens  : 392
    reason  : content contains "login"

────────────────────────────────────────────────
  Tokens used : 2,269 / 10,000
  Remaining   : 7,731
════════════════════════════════════════════════
```

## How It Works

1. **Scanner** - recursively discovers all files, respects `.nuvantaignore`, skips binaries and build artifacts
2. **Secret Guard** - detects hardcoded credentials and excludes those files from context
3. **Relevance Engine** - scores each file by filename, directory path, and content against your task keywords
4. **AI Scoring** - Gemini re-ranks candidates for deeper relevance judgment
5. **Budget Selector** - picks the highest-scored files that fit within the token limit
6. **Report** - prints score, token count, and reason for each selected file

## Ignoring Files

Create a `.nuvantaignore` file at your project root to exclude files, directories, or extensions:

```
# directories
private
infra

# files
config.local.ts

# extensions
.test.ts
```

## Secret Detection

Files containing hardcoded credentials are automatically skipped and a warning is printed:

```
[WARN] Skipped (secrets detected): src/config/keys.ts
       Line 3 - API Key (generic): api_key = sk-abc123...
```

Detected patterns include API keys, passwords, tokens, private key headers, AWS credentials, database URLs, and Bearer tokens.

## Requirements

- Node.js 18+
- A Gemini API key (for AI scoring) - set `GEMINI_API_KEY` in your environment or a `.env` file

## License

MIT
