/** Small dependency-free helpers shared across the engine. */

/** URL-safe slug. Mirrors python-slugify closely enough for our needs. */
export function slugify(text: string, maxLength = 80): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  // Truncate on a word (hyphen) boundary.
  return slug.slice(0, maxLength).replace(/-+[^-]*$/, "").replace(/-+$/, "");
}

/** Today's date as ISO yyyy-mm-dd in UTC. */
export function isoToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Pull a JSON value out of an LLM response. LLMs wrap JSON in ```json
 * fences or chatty preamble; this strips that and parses the first
 * object/array. Throws if none is found.
 */
export function extractJson<T = unknown>(raw: string): T {
  let text = raw.trim();

  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline !== -1) text = text.slice(firstNewline + 1);
    if (text.trimEnd().endsWith("```")) {
      text = text.trimEnd().slice(0, -3);
    }
    text = text.trim();
  }

  const starts = [text.indexOf("{"), text.indexOf("[")].filter((i) => i !== -1);
  if (starts.length === 0) {
    throw new Error("No JSON object found in LLM response.");
  }
  const start = Math.min(...starts);

  const ends = [text.lastIndexOf("}"), text.lastIndexOf("]")].filter(
    (i) => i !== -1,
  );
  if (ends.length === 0) {
    throw new Error("No JSON terminator found in LLM response.");
  }
  const end = Math.max(...ends);

  return JSON.parse(text.slice(start, end + 1)) as T;
}

/** Clip whitespace-collapsed text to a max length with an ellipsis. */
export function clip(text: string, limit = 90): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= limit) return t;
  return t.slice(0, limit - 1).trimEnd() + "…";
}

/** First sentence of `text`, capped at `maxLen` on a word boundary. */
export function firstSentence(text: string, maxLen: number): string {
  const t = text.split(/\s+/).join(" ").trim();
  const parts = t.split(/(?<=[.!?])\s+/);
  let first = parts[0] ?? t;
  if (first.length > maxLen) {
    first =
      first
        .slice(0, maxLen - 1)
        .replace(/\s+\S*$/, "")
        .replace(/[,;:]+$/, "") + ".";
  }
  return first;
}

/** Sleep for ms. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
