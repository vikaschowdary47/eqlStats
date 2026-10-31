# eqlStats

Every service behind your project, in one place. A multi-user app where developers keep the console links, notes and services behind each project, see live health, and share read-only views with section-level toggles.

The name lives in `src/lib/brand.ts`, so renaming is a one-line change.

## What's in it

- **Accounts**: email + password with confirmation, GitHub sign-in, password reset, profile, account deletion (cascades all data).
- **Projects** with sections (Frontend, Backend, Domains & infra, Money, Code & docs; rename, add, delete).
- **Smart link capture**: paste a console URL and it's named and filed automatically. `console.cloud.google.com/apis/api/gmail.googleapis.com/credentials` becomes "Gmail API · Credentials" in Backend. Recognises Google Cloud, Firebase, Vercel, Supabase, Cloudflare, Stripe, GitHub, AWS, OpenAI, Anthropic, Netlify, Railway, Render, registrars, and more (`src/lib/recognize.ts`). Notes, pinning, editing. Press `/` to jump to the paste box.
- **Live status** (`src/lib/integrations/checks.ts`):
  - Vercel: latest production deploy (live, building, failed)
  - Supabase: project healthy, paused or restoring
  - Cloudflare: zone active, pending nameservers, paused
  - Domain: registrar and expiry from public RDAP, no key needed
  - OpenAI / Anthropic / Gemini: key valid or revoked; optional credit check (1-token request)
- **Share links**: toggle sections, live status, clickable links and stats per link; expiry (1 day, 7 days, 30 days, never); edit later; turn off instantly; view counts.
- **Simple analytics**: services healthy, 7-day uptime, last deploy, share views, 14-day daily health strip.

## Security model

- Row Level Security on every table; every row has an `owner_id`, and a trigger stops child rows pointing at someone else's project.
- Integration tokens are encrypted with AES-256-GCM in the app (`APP_ENCRYPTION_KEY`) before they reach the database. The ciphertext column isn't readable with the browser key at all (column-level grants), only by the server when running a check.
- Share tokens are stored as a SHA-256 hash for lookup, plus an encrypted copy so the owner can copy the link again. Share pages never select secrets, and strip URLs server-side when "Clickable links" is off.
- The service-role client is used only for checks, share pages, the owner's own share URL, and account deletion; each query is scoped explicitly.
- Auth emails always link to `NEXT_PUBLIC_APP_URL` (not the request host), redirects are same-site only, sign-out is POST, and the cron endpoint requires a constant-time-compared bearer secret.
- No user-supplied URL is ever fetched by the server (no SSRF surface); domains go to rdap.org only.

## Setup (about 10 minutes)

1. **Create a Supabase project** (a new one, separate from your other apps).
2. **Run the schema**: Supabase dashboard → SQL Editor → paste `supabase/migrations/0001_init.sql` → Run. (Or `supabase db push` with the CLI.)
3. **Auth settings** (Authentication → URL Configuration):
   - Site URL: `http://localhost:3000` (your production URL later)
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback`
4. **GitHub sign-in (optional)**: Authentication → Providers → GitHub. Create an OAuth app at github.com/settings/developers with callback `https://YOUR-REF.supabase.co/auth/v1/callback`.
5. **Environment**:
   ```bash
   cp .env.example .env.local
   openssl rand -base64 32   # APP_ENCRYPTION_KEY
   openssl rand -hex 32      # CRON_SECRET
   ```
   Fill in the Supabase URL, anon key and service role key from Project Settings → API.
6. **Run it**:
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000, sign up, create a project.

## Deploying

Deploy to Vercel and set the same environment variables (with `NEXT_PUBLIC_APP_URL` set to your domain). Add the production callback URL in Supabase.

**Scheduled checks**: `vercel.json` calls `/api/cron/checks` once a day, which is the Hobby plan limit. For more frequent checks, use Vercel Pro (change the schedule to e.g. `*/15 * * * *`) or any external scheduler that sends `Authorization: Bearer $CRON_SECRET`. "Check now" on each project works any time.

**Keep `APP_ENCRYPTION_KEY` safe and stable.** Changing it makes stored tokens unreadable (they'll show "Add a token" until re-entered).

## Project layout

```
supabase/migrations/0001_init.sql   schema, RLS, grants, triggers
src/proxy.ts                        session refresh + route guard (Next 16 proxy)
src/lib/recognize.ts                URL → title, provider, section
src/lib/integrations/               provider specs, checks, runner
src/lib/crypto.ts                   AES-256-GCM, hashing, tokens
src/lib/data.ts                     queries and stats
src/app/(auth)/                     login, signup, reset
src/app/(app)/                      dashboard, projects, settings, actions.ts
src/app/s/[token]/                  public share view
src/app/api/cron/checks/            scheduled checks
```

## Next steps worth considering

- Billing (Stripe) and plan limits
- Teams: invite collaborators with roles
- More integrations: Stripe revenue, GitHub Actions, Sentry, App Store Connect
- Browser extension / desktop widget for one-click capture
- Status-change alerts by email

## Project studio frontend

The redesign is available without database credentials at `http://localhost:4400/studio-preview`:

```sh
npm ci
npm run build
npm run start -- -p 4400
```

This frontend includes projects in gallery/atlas views, project workspaces, notes, service/account references, artifacts, decisions, sample GitHub discovery/import, connection preferences, and studio settings. Create/edit/pin actions persist in this browser using localStorage. Sample content is included. Connections remain disconnected; no GitHub, MCP, or Supabase calls are made by this frontend workspace. EQL Share integration is deferred.

The existing authenticated application remains at `/dashboard` and uses the existing Supabase configuration and RLS. Its project gallery shares the redesigned visual component. No migrations are required for this change. See `DESIGN.md` for the design system and `design-review/VALIDATION.md` for checks and limitations.
