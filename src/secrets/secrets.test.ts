import { describe, it, expect } from "vitest";
import { detectSecrets } from "./index.js";

describe("detectSecrets", () => {
  // --- no secrets ---

  it("returns empty array for clean content", () => {
    const content = `const x = 1;\nconsole.log(x);`;
    expect(detectSecrets(content)).toEqual([]);
  });

  it("ignores comment lines starting with //", () => {
    const content = `// api_key = supersecretkey1234567890`;
    expect(detectSecrets(content)).toEqual([]);
  });

  it("ignores comment lines starting with #", () => {
    const content = `# password = hunter2abc123`;
    expect(detectSecrets(content)).toEqual([]);
  });

  it("ignores comment lines starting with *", () => {
    const content = `* token = abcdefghijklmnopqrstuvwxyz`;
    expect(detectSecrets(content)).toEqual([]);
  });

  it("ignores comment lines starting with <!--", () => {
    const content = `<!-- api_key = supersecretkey1234567890 -->`;
    expect(detectSecrets(content)).toEqual([]);
  });

  // --- API Key ---

  it("detects api_key assignment", () => {
    const content = `api_key = supersecretkey1234567890`;
    const result = detectSecrets(content);
    expect(result).toHaveLength(1);
    expect(result[0].pattern).toBe("API Key (generic)");
    expect(result[0].line).toBe(1);
  });

  it("detects apikey with colon", () => {
    const content = `apikey: "abcdefghijklmnopqrstu"`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("API Key (generic)");
  });

  // --- Secret Key ---

  it("detects secret_key assignment", () => {
    const content = `secret_key = my-super-secret-value-here`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Secret Key");
  });

  // --- Password ---

  it("detects password assignment", () => {
    const content = `password = hunter2abc`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Password");
  });

  it("detects passwd variant", () => {
    const content = `passwd = hunter2abc`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Password");
  });

  it("does not flag password shorter than 6 chars", () => {
    const content = `password = hi`;
    expect(detectSecrets(content)).toEqual([]);
  });

  // --- Token ---

  it("detects token assignment", () => {
    const content = `token = abcdefghijklmnopqrstuvwxyz`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Token");
  });

  it("detects access_token", () => {
    const content = `access_token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Token");
  });

  // --- Private Key ---

  it("detects RSA private key header", () => {
    const content = `-----BEGIN RSA PRIVATE KEY-----`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Private Key Header");
  });

  it("detects generic private key header", () => {
    const content = `-----BEGIN PRIVATE KEY-----`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Private Key Header");
  });

  // --- AWS ---

  it("detects AWS access key ID", () => {
    const content = `AKIAIOSFODNN7EXAMPLE`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("AWS Access Key");
  });

  it("detects aws_secret assignment", () => {
    const content = `aws_secret = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY1234`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("AWS Secret");
  });

  // --- Database URL ---

  it("detects database_url", () => {
    const content = `database_url = postgres://user:pass@localhost:5432/db`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Database URL");
  });

  it("detects connection_string", () => {
    const content = `connection_string = mongodb://admin:pass@cluster.mongodb.net/mydb`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Database URL");
  });

  // --- Bearer Token ---

  it("detects Bearer token in Authorization header", () => {
    const content = `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abc`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Bearer Token");
  });

  // --- Basic Auth URL ---

  it("detects credentials embedded in URL", () => {
    const content = `const url = "https://admin:password@example.com/api"`;
    const result = detectSecrets(content);
    expect(result[0].pattern).toBe("Basic Auth URL");
  });

  // --- line number & preview ---

  it("reports correct line number", () => {
    const content = `const x = 1;\nconst y = 2;\napi_key = supersecretkey1234567890`;
    const result = detectSecrets(content);
    expect(result[0].line).toBe(3);
  });

  it("truncates preview to 60 chars with ellipsis", () => {
    const long = `api_key = supersecretkey1234567890_extra_padding_to_exceed_sixty_chars`;
    const result = detectSecrets(long);
    expect(result[0].preview).toHaveLength(63); // 60 + "..."
    expect(result[0].preview.endsWith("...")).toBe(true);
  });

  it("does not add ellipsis when preview is under 60 chars", () => {
    const content = `api_key = supersecretkey1234567890`;
    const result = detectSecrets(content);
    expect(result[0].preview.endsWith("...")).toBe(false);
  });

  // --- one match per line ---

  it("returns only one match per line even if multiple patterns match", () => {
    // token + bearer on same line — hanya satu kena return
    const content = `token = Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abc`;
    const result = detectSecrets(content);
    expect(result).toHaveLength(1);
  });

  // --- multiline ---

  it("detects secrets across multiple lines", () => {
    const content = [
      `database_url = postgres://localhost:5432/mydb`,
      `const clean = "hello world"`,
      `api_key = supersecretkey1234567890`,
    ].join("\n");

    const result = detectSecrets(content);
    expect(result).toHaveLength(2);
    expect(result[0].line).toBe(1);
    expect(result[0].pattern).toBe("Database URL");
    expect(result[1].line).toBe(3);
    expect(result[1].pattern).toBe("API Key (generic)");
  });
});
