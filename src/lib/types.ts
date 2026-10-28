export type Status = "ok" | "warn" | "down" | "unknown";

export type SectionKind = "frontend" | "backend" | "infra" | "money" | "code" | "custom";

export type Provider = "vercel" | "supabase" | "cloudflare" | "domain" | "openai" | "anthropic" | "gemini";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  project_id: string;
  name: string;
  kind: SectionKind;
  position: number;
}

export interface Resource {
  id: string;
  project_id: string;
  section_id: string | null;
  kind: "link" | "note";
  title: string;
  url: string | null;
  provider: string | null;
  note: string | null;
  pinned: boolean;
  created_at: string;
}

export interface Integration {
  id: string;
  project_id: string;
  section_id: string | null;
  provider: Provider;
  label: string;
  config: Record<string, unknown>;
  secret_hint: string | null;
  last_status: Status;
  last_summary: string | null;
  last_details: Record<string, unknown>;
  last_checked_at: string | null;
  created_at: string;
}

export interface ShareLink {
  id: string;
  project_id: string;
  label: string;
  visible_section_ids: string[];
  show_status: boolean;
  show_links: boolean;
  show_stats: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

// Columns the browser key may read (secret columns are excluded at the database level).
export const INTEGRATION_COLUMNS =
  "id, project_id, section_id, provider, label, config, secret_hint, last_status, last_summary, last_details, last_checked_at, created_at";

export const SHARE_COLUMNS =
  "id, project_id, label, visible_section_ids, show_status, show_links, show_stats, expires_at, revoked_at, view_count, last_viewed_at, created_at";

export const DEFAULT_SECTIONS: { name: string; kind: SectionKind }[] = [
  { name: "Frontend", kind: "frontend" },
  { name: "Backend", kind: "backend" },
  { name: "Domains & infra", kind: "infra" },
  { name: "Money", kind: "money" },
  { name: "Code & docs", kind: "code" },
];
