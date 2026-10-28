import type { Provider, SectionKind } from "../types";

// Describes each integration for the "Connect a service" form.
// Shared by client and server; contains no secrets.

export interface ProviderField {
  key: string;
  label: string;
  placeholder?: string;
  help?: string;
  optional?: boolean;
  type?: "text" | "checkbox";
}

export interface ProviderSpec {
  id: Provider;
  name: string;
  blurb: string;
  section: SectionKind;
  secret?: { label: string; help: string; createUrl: string };
  fields: ProviderField[];
}

export const PROVIDERS: ProviderSpec[] = [
  {
    id: "vercel",
    name: "Vercel",
    blurb: "Latest production deployment and whether it built.",
    section: "frontend",
    secret: {
      label: "Access token",
      help: "Create a token scoped to the team that owns the project.",
      createUrl: "https://vercel.com/account/settings/tokens",
    },
    fields: [
      { key: "projectId", label: "Project name or ID", placeholder: "my-app or prj_…" },
      { key: "teamId", label: "Team ID", placeholder: "team_…", optional: true, help: "Needed when the project belongs to a team." },
    ],
  },
  {
    id: "supabase",
    name: "Supabase",
    blurb: "Project status: healthy, paused or restoring.",
    section: "backend",
    secret: {
      label: "Personal access token",
      help: "Used read-only to look up project status.",
      createUrl: "https://supabase.com/dashboard/account/tokens",
    },
    fields: [{ key: "projectRef", label: "Project ref", placeholder: "abcdefghijklmnop", help: "The id in your project URL." }],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    blurb: "Zone status and nameservers for a domain.",
    section: "infra",
    secret: {
      label: "API token",
      help: "Use the “Read all resources” template, or Zone:Read for this zone.",
      createUrl: "https://dash.cloudflare.com/profile/api-tokens",
    },
    fields: [{ key: "zone", label: "Domain", placeholder: "example.com" }],
  },
  {
    id: "domain",
    name: "Domain",
    blurb: "Registrar and expiry date from the public registry. No key needed.",
    section: "infra",
    fields: [{ key: "domain", label: "Domain", placeholder: "example.com" }],
  },
  {
    id: "openai",
    name: "OpenAI",
    blurb: "Whether the key works, and optionally whether it has credit.",
    section: "backend",
    secret: { label: "API key", help: "A restricted key with model read access is enough.", createUrl: "https://platform.openai.com/api-keys" },
    fields: [
      { key: "creditCheck", label: "Check for remaining credit", type: "checkbox", optional: true, help: "Sends a 1-token request each check. Costs a fraction of a cent." },
      { key: "model", label: "Model for credit check", placeholder: "gpt-4o-mini", optional: true },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    blurb: "Whether the key works, and optionally whether it has credit.",
    section: "backend",
    secret: { label: "API key", help: "Create a dedicated key for monitoring.", createUrl: "https://console.anthropic.com/settings/keys" },
    fields: [
      { key: "creditCheck", label: "Check for remaining credit", type: "checkbox", optional: true, help: "Sends a 1-token request each check. Costs a fraction of a cent." },
      { key: "model", label: "Model for credit check", placeholder: "claude-haiku-4-5", optional: true },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    blurb: "Whether the API key is valid and enabled.",
    section: "backend",
    secret: { label: "API key", help: "From Google AI Studio.", createUrl: "https://aistudio.google.com/apikey" },
    fields: [],
  },
];

export const providerSpec = (id: string) => PROVIDERS.find((p) => p.id === id);
