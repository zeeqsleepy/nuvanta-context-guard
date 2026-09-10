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
Nuvanta Context Guard
─────────────────────────────────────

Task: fix login button
Keywords: login, button
Budget: 5000 tokens

Files found: 24
Relevant: 5
Selected: 4
Context used: 3,842 / 5,000 tokens
Reduction: ~83%

Selected files:
 src\auth\login.ts                     820 tokens score 1.6
 src\components\LoginButton.tsx        612 tokens score 1.0
 src\api\auth.ts                       445 tokens score 0.5
 src\index.ts                          392 tokens score 0.5
```

## How It Works

1. **Scanner** — recursively discovers all files in the project
2. **Relevance Engine** — scores each file based on filename, directory, and content
3. **Budget Selector** — picks the most relevant files within the token limit
4. **Output** — prints a clean report

## License

MIT
