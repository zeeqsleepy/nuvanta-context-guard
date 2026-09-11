// ─── Secret Detection ────────────────────────────────────────────────────────
// Scans file content for hardcoded credentials and sensitive values.
// Called during scanDirectory — files with secrets are excluded from context.

export interface SecretMatch {
  pattern: string;
  line: number;
  preview: string;
}

const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  {
    name: "API Key (generic)",
    regex: /(?:api[_-]?key|apikey)\s*[=:]\s*["']?[\w\-]{16,}["']?/i,
  },
  {
    name: "Secret Key",
    regex: /(?:secret[_-]?key|secret)\s*[=:]\s*["']?[\w\-]{16,}["']?/i,
  },
  {
    name: "Password",
    regex: /(?:password|passwd|pwd)\s*[=:]\s*["']?.{6,}["']?/i,
  },
  {
    name: "Token",
    regex:
      /(?:token|auth[_-]?token|access[_-]?token)\s*[=:]\s*["']?[\w\-\.]{16,}["']?/i,
  },
  {
    name: "Private Key Header",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "AWS Access Key",
    regex: /AKIA[0-9A-Z]{16}/,
  },
  {
    name: "AWS Secret",
    regex: /(?:aws[_-]?secret|aws[_-]?access)\s*[=:]\s*["']?[\w\/\+]{40}["']?/i,
  },
  {
    name: "Database URL",
    regex:
      /(?:database[_-]?url|db[_-]?url|connection[_-]?string)\s*[=:]\s*["']?[\w\+]+:\/\/.+["']?/i,
  },
  {
    name: "Bearer Token",
    regex: /Bearer\s+[\w\-\.]{20,}/i,
  },
  {
    name: "Basic Auth URL",
    regex: /https?:\/\/[\w\-]+:[\w\-]+@/i,
  },
];

// Comment prefixes to skip — secrets in comments are not runtime secrets
const COMMENT_PREFIXES = ["//", "#", "*", "<!--"];

export function detectSecrets(content: string): SecretMatch[] {
  const matches: SecretMatch[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (COMMENT_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
      continue;
    }

    for (const { name, regex } of SECRET_PATTERNS) {
      if (regex.test(lines[i])) {
        matches.push({
          pattern: name,
          line: i + 1,
          preview: trimmed.slice(0, 60) + (trimmed.length > 60 ? "..." : ""),
        });
        break; // one match per line
      }
    }
  }

  return matches;
}
