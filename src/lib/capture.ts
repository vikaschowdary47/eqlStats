import { recognize } from "./recognize";

export type CaptureKind = "note" | "artifact" | "decision" | "service";
export interface CaptureProject {
  id: string;
  name: string;
  website_url?: string | null;
}
export interface CaptureItem {
  id: string;
  title: string;
  body: string;
  url: string;
  kind: CaptureKind;
  projectId: string;
  reason: string;
  file?: File;
}
const compact = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Only HTTP(S) links are actionable. Never visits or fetches pasted content. */
export function captureUrl(value: string): string | null {
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname.includes(".")
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function suggestProject(
  value: string,
  projects: CaptureProject[],
): string {
  const text = compact(value);
  const scored = projects
    .map((p) => {
      const name = compact(p.name);
      const id = compact(p.id);
      let score = name.length >= 3 && text.includes(name) ? name.length : 0;
      if (id.length >= 3 && text.includes(id))
        score = Math.max(score, id.length);
      if (p.website_url) {
        try {
          if (value.includes(new URL(p.website_url).hostname)) score += 100;
        } catch {
          /* optional site */
        }
      }
      return { id: p.id, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score !== scored[1]?.score ? scored[0].id : "";
}

export function parseCapture(
  text: string,
  projects: CaptureProject[],
): CaptureItem[] {
  // Include protocol-less domains and markdown links. Invalid links stay as note text.
  const expression =
    /(?:https?:\/\/|www\.)[^\s<>"`]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"`]*)?/gi;
  const matches = [...text.matchAll(expression)];
  const items: CaptureItem[] = [];
  const seen = new Set<string>();
  let remaining = text;
  for (const match of matches) {
    let raw = match[0].replace(/[.,;!?:]+$/, "");
    while (
      /[\])}]$/.test(raw) &&
      (raw.match(/[\[({]/g) || []).length < (raw.match(/[\])}]/g) || []).length
    )
      raw = raw.slice(0, -1);
    if (match.index && /[@\w]/.test(text[match.index - 1])) continue;
    if (
      !/^https?:\/\//i.test(raw) &&
      /\.(?:md|txt|pdf|png|jpe?g|svg|webp|json|csv|log|zip|docx?|xlsx?|pptx?)$/i.test(
        raw,
      )
    )
      continue;
    const url = captureUrl(raw);
    if (!url) continue;
    remaining = remaining.replace(raw, "");
    if (seen.has(url)) continue;
    seen.add(url);
    let recognized;
    try {
      recognized = recognize(url);
    } catch {
      /* malformed percent escapes use hostname fallback */
    }
    const host = new URL(url).hostname;
    const artifact =
      /(?:figma\.com|notion\.(?:so|site)|docs\.google\.com|drive\.google\.com|miro\.com|dropbox\.com)$/.test(
        host,
      ) ||
      /\.(?:pdf|png|jpe?g|svg|webp|zip|docx?|xlsx?|pptx?)(?:[?#]|$)/i.test(url);
    const kind: CaptureKind =
      artifact ||
      recognized?.provider === "github" ||
      recognized?.provider === "web"
        ? "artifact"
        : "service";
    const projectId = suggestProject(url, projects);
    items.push({
      id: `link:${url}`,
      url,
      title: recognized
        ? `${recognized.providerName} · ${recognized.title}`
        : host,
      body: "",
      kind,
      projectId,
      reason: `${recognized?.providerName || host} link · ${kind === "service" ? "service reference" : "project reference"}${projectId ? " · project name matched" : ""}`,
    });
  }
  const note = remaining
    .replace(/\[([^\]]+)\]\(\s*\)/g, "$1")
    .replace(/^\s*[-*•.,;:!?]+\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (note && /[\p{L}\p{N}]/u.test(note)) {
    const decision =
      /^(?:decision\s*:|we (?:decided|chose)\b|decided\s+to\b)/i.test(note);
    const title = note
      .split("\n")[0]
      .replace(/^#+\s*/, "")
      .slice(0, 100);
    items.push({
      id: "text",
      title,
      body: note,
      url: "",
      kind: decision ? "decision" : "note",
      projectId: suggestProject(note, projects),
      reason: decision
        ? "Decision wording recognized"
        : "Your text, kept as project memory",
    });
  }
  return items;
}

export function readableFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
