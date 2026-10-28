import type { SectionKind } from "./types";

// Turns a pasted console URL into a readable title, a provider and the section
// it most likely belongs to. Pure function: runs in the browser (live preview)
// and on the server (when saving). It never fetches the URL.

export interface Recognized {
  provider: string;       // short id, e.g. "google-cloud"
  providerName: string;   // display name, e.g. "Google Cloud"
  title: string;          // e.g. "Gmail API · Credentials"
  section: SectionKind;
  context?: string;       // e.g. the cloud project id
}

const GOOGLE_APIS: Record<string, string> = {
  gmail: "Gmail API",
  drive: "Google Drive API",
  calendar: "Google Calendar API",
  sheets: "Google Sheets API",
  docs: "Google Docs API",
  youtube: "YouTube Data API",
  maps: "Maps API",
  "maps-backend": "Maps JavaScript API",
  places: "Places API",
  "places-backend": "Places API",
  geocoding: "Geocoding API",
  people: "People API",
  firestore: "Firestore",
  storage: "Cloud Storage",
  aiplatform: "Vertex AI",
  generativelanguage: "Gemini API",
  identitytoolkit: "Identity Platform",
  fcm: "Firebase Cloud Messaging",
  firebase: "Firebase",
};

const GOOGLE_PAGES: [RegExp, string][] = [
  [/\/apis\/credentials\/consent|\/auth\/branding|\/auth\/audience/, "OAuth consent screen"],
  [/\/auth\/clients/, "OAuth clients"],
  [/\/credentials\/oauthclient/, "OAuth client"],
  [/\/credentials(\/|$)/, "Credentials"],
  [/\/quotas(\/|$)/, "Quotas"],
  [/\/metrics(\/|$)/, "Metrics"],
  [/\/apis\/library/, "API library"],
  [/\/apis\/dashboard/, "Enabled APIs"],
  [/\/billing/, "Billing"],
  [/\/iam-admin/, "IAM"],
  [/\/run/, "Cloud Run"],
  [/\/functions/, "Cloud Functions"],
  [/\/logs/, "Logs"],
];

const ACRONYMS: Record<string, string> = { Dns: "DNS", Ssl: "SSL", Tls: "TLS", Api: "API", Apis: "APIs", Url: "URL", Oauth: "OAuth", Sql: "SQL", Iam: "IAM", Ai: "AI", Waf: "WAF", Cdn: "CDN" };
const titleCase = (s: string) =>
  s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b[A-Z][a-z]+\b/g, (w) => ACRONYMS[w] ?? w)
    .trim();

const pageName = (segment: string | undefined) => (segment ? titleCase(decodeURIComponent(segment)) : "");

function google(u: URL): Recognized {
  const path = u.pathname;
  const project = u.searchParams.get("project") ?? undefined;
  const apiMatch = path.match(/\/apis\/(?:api|library)\/([a-z0-9-]+)\.googleapis\.com/);
  const api = apiMatch ? GOOGLE_APIS[apiMatch[1]] ?? `${titleCase(apiMatch[1])} API` : undefined;
  const page = GOOGLE_PAGES.find(([re]) => re.test(path))?.[1];
  const title = [api, page].filter(Boolean).join(" · ") || "Google Cloud console";
  return { provider: "google-cloud", providerName: "Google Cloud", title, section: "backend", context: project };
}

function vercel(u: URL): Recognized {
  const [team, project, ...rest] = u.pathname.split("/").filter(Boolean);
  const page = rest[0] === "settings" && rest[1] ? pageName(rest[1]) : pageName(rest[0]);
  const title = project ? [project, page || "Overview"].join(" · ") : team ? `${team} · Dashboard` : "Dashboard";
  return { provider: "vercel", providerName: "Vercel", title, section: "frontend", context: team };
}

const SUPABASE_PAGES: Record<string, string> = {
  editor: "Table editor",
  sql: "SQL editor",
  auth: "Authentication",
  storage: "Storage",
  functions: "Edge Functions",
  database: "Database",
  logs: "Logs",
  reports: "Reports",
  advisors: "Advisors",
  realtime: "Realtime",
  settings: "Settings",
};

function supabase(u: URL): Recognized {
  const parts = u.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("project");
  const ref = i >= 0 ? parts[i + 1] : undefined;
  const [area, sub] = i >= 0 ? parts.slice(i + 2) : [];
  const areaName = area ? SUPABASE_PAGES[area] ?? pageName(area) : "";
  const subName = sub && !/^\d+$/.test(sub) && area !== "editor" && area !== "sql" ? pageName(sub) : "";
  return {
    provider: "supabase",
    providerName: "Supabase",
    title: [areaName || "Project dashboard", subName].filter(Boolean).join(" · "),
    section: "backend",
    context: ref,
  };
}

function cloudflare(u: URL): Recognized {
  const parts = u.pathname.split("/").filter(Boolean); // [account, zone, page...]
  const zone = parts[1] && parts[1].includes(".") ? parts[1] : undefined;
  const page = zone ? pageName(parts[2]) : pageName(parts[1]);
  const title = [zone, page || "Overview"].filter(Boolean).join(" · ");
  return { provider: "cloudflare", providerName: "Cloudflare", title, section: "infra", context: zone };
}

function stripe(u: URL): Recognized {
  const parts = u.pathname.split("/").filter(Boolean);
  const test = parts[0] === "test";
  const page = pageName(test ? parts[1] : parts[0]) || "Dashboard";
  return { provider: "stripe", providerName: "Stripe", title: test ? `${page} (test mode)` : page, section: "money" };
}

function github(u: URL): Recognized {
  const [owner, repo, ...rest] = u.pathname.split("/").filter(Boolean);
  const page = rest[0] === "settings" && rest[1] ? `Settings · ${pageName(rest[1])}` : pageName(rest[0]);
  const title = repo ? [`${owner}/${repo}`, page].filter(Boolean).join(" · ") : owner ?? "GitHub";
  return { provider: "github", providerName: "GitHub", title, section: "code" };
}

type Rule = { test: (host: string) => boolean; fn: (u: URL) => Recognized };

const simple = (provider: string, providerName: string, section: SectionKind): Rule["fn"] => (u) => {
  const segs = u.pathname.split("/").filter(Boolean);
  const last = segs.filter((s) => !/^[0-9a-f-]{16,}$/i.test(s)).slice(-2).map(pageName).join(" · ");
  return { provider, providerName, title: last || "Dashboard", section };
};

const RULES: Rule[] = [
  { test: (h) => h === "console.cloud.google.com", fn: google },
  { test: (h) => h === "console.firebase.google.com", fn: simple("firebase", "Firebase", "backend") },
  { test: (h) => h === "vercel.com", fn: vercel },
  { test: (h) => h === "supabase.com" || h === "app.supabase.com", fn: supabase },
  { test: (h) => h === "dash.cloudflare.com", fn: cloudflare },
  { test: (h) => h === "dashboard.stripe.com", fn: stripe },
  { test: (h) => h === "github.com", fn: github },
  { test: (h) => h === "app.netlify.com", fn: simple("netlify", "Netlify", "frontend") },
  { test: (h) => h === "railway.com" || h === "railway.app", fn: simple("railway", "Railway", "backend") },
  { test: (h) => h === "dashboard.render.com", fn: simple("render", "Render", "backend") },
  { test: (h) => h.endsWith("console.aws.amazon.com"), fn: simple("aws", "AWS", "backend") },
  { test: (h) => h === "platform.openai.com", fn: simple("openai", "OpenAI", "backend") },
  { test: (h) => h === "console.anthropic.com" || h === "platform.claude.com", fn: simple("anthropic", "Anthropic", "backend") },
  { test: (h) => h === "aistudio.google.com", fn: simple("gemini", "Google AI Studio", "backend") },
  { test: (h) => h === "app.posthog.com" || h.endsWith(".posthog.com"), fn: simple("posthog", "PostHog", "frontend") },
  { test: (h) => h === "sentry.io" || h.endsWith(".sentry.io"), fn: simple("sentry", "Sentry", "backend") },
  { test: (h) => h === "resend.com", fn: simple("resend", "Resend", "backend") },
  { test: (h) => h.endsWith("namecheap.com"), fn: simple("namecheap", "Namecheap", "infra") },
  { test: (h) => h === "porkbun.com", fn: simple("porkbun", "Porkbun", "infra") },
  { test: (h) => h.endsWith("godaddy.com"), fn: simple("godaddy", "GoDaddy", "infra") },
  { test: (h) => h === "app.lemonsqueezy.com", fn: simple("lemonsqueezy", "Lemon Squeezy", "money") },
  { test: (h) => h === "app.revenuecat.com", fn: simple("revenuecat", "RevenueCat", "money") },
  { test: (h) => h === "appstoreconnect.apple.com", fn: simple("app-store", "App Store Connect", "money") },
  { test: (h) => h === "play.google.com", fn: simple("google-play", "Google Play Console", "money") },
  { test: (h) => h === "www.figma.com" || h === "figma.com", fn: simple("figma", "Figma", "frontend") },
  { test: (h) => h === "www.notion.so" || h === "notion.so", fn: simple("notion", "Notion", "code") },
  { test: (h) => h === "linear.app", fn: simple("linear", "Linear", "code") },
];

export function parseUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!u.hostname.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

export function recognize(input: string): Recognized | null {
  const u = parseUrl(input);
  if (!u) return null;
  const host = u.hostname.replace(/^www\.(?=github|vercel|supabase)/, "");
  const rule = RULES.find((r) => r.test(host));
  if (rule) return rule.fn(u);
  const name = titleCase(host.replace(/^www\./, "").split(".").slice(0, -1).join(" ") || host);
  const page = pageName(u.pathname.split("/").filter(Boolean).pop());
  return { provider: "web", providerName: name, title: page ? `${name} · ${page}` : name, section: "code" };
}

// Short monogram shown next to links when no logo is available.
export function monogram(providerName: string): string {
  const words = providerName.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : providerName.slice(0, 2)).toUpperCase();
}
