// ─── AI Scoring (Gemini) ─────────────────────────────────────────────────────
// Sends candidate file paths to Gemini for relevance scoring against the task.
// Returns a map of file path → score (0.0–1.0).
// Fails gracefully — if Gemini is unavailable, returns empty scores.

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function scoreFilesWithAI(
  task: string,
  candidates: string[],
): Promise<Record<string, number>> {
  if (!task || candidates.length === 0) return {};

  const prompt = `
You are a code relevance expert.

Task: "${task}"

Below is a list of file paths from a software project.
For each file, give a relevance score from 0.0 to 1.0.
0.0 = not relevant at all
1.0 = very likely relevant to the task

Files:
${candidates.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Respond ONLY with a JSON object like this:
{
  "scores": [0.9, 0.2, 0.7, ...]
}

The array must have exactly ${candidates.length} numbers, one per file, in the same order.
  `.trim();

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const scores: Record<string, number> = {};
    candidates.forEach((file, i) => {
      scores[file] = parsed.scores[i] ?? 0;
    });

    return scores;
  } catch {
    // if AI scoring fails, continue without it
    return {};
  }
}
