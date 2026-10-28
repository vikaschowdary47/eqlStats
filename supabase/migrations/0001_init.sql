-- eqlStats: initial schema
-- Every row is owned by one user. Row Level Security keeps tenants apart.
-- Secrets (integration tokens, share tokens) are encrypted by the app before
-- they reach the database, and their columns are not readable from the browser.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Projects and their sections
-- ---------------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  description  text check (char_length(description) <= 280),
  website_url  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index projects_owner_idx on public.projects (owner_id);

create table public.sections (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  kind        text not null default 'custom'
              check (kind in ('frontend','backend','infra','money','code','custom')),
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);
create index sections_project_idx on public.sections (project_id, position);

-- Links and notes saved to a project
create table public.resources (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  section_id  uuid references public.sections (id) on delete set null,
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null default 'link' check (kind in ('link','note')),
  title       text not null check (char_length(title) between 1 and 140),
  url         text check (url is null or url ~* '^https?://'),
  provider    text,
  note        text check (char_length(note) <= 4000),
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index resources_project_idx on public.resources (project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Integrations (live health checks)
-- ---------------------------------------------------------------------------
create table public.integrations (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  section_id         uuid references public.sections (id) on delete set null,
  owner_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider           text not null
                     check (provider in ('vercel','supabase','cloudflare','domain','openai','anthropic','gemini')),
  label              text not null check (char_length(label) between 1 and 80),
  config             jsonb not null default '{}'::jsonb,
  secret_ciphertext  text,           -- AES-256-GCM, encrypted by the app server
  secret_hint        text,           -- last 4 characters, for recognition only
  last_status        text not null default 'unknown' check (last_status in ('ok','warn','down','unknown')),
  last_summary       text,
  last_details       jsonb not null default '{}'::jsonb,
  last_checked_at    timestamptz,
  created_at         timestamptz not null default now()
);
create index integrations_project_idx on public.integrations (project_id);
create index integrations_due_idx on public.integrations (last_checked_at nulls first);

create table public.integration_checks (
  id              bigint generated always as identity primary key,
  integration_id  uuid not null references public.integrations (id) on delete cascade,
  project_id      uuid not null references public.projects (id) on delete cascade,
  owner_id        uuid not null references auth.users (id) on delete cascade,
  status          text not null check (status in ('ok','warn','down','unknown')),
  summary         text,
  latency_ms      int,
  checked_at      timestamptz not null default now()
);
create index integration_checks_project_time_idx on public.integration_checks (project_id, checked_at desc);

-- ---------------------------------------------------------------------------
-- Share links
-- ---------------------------------------------------------------------------
create table public.share_links (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects (id) on delete cascade,
  owner_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label                text not null check (char_length(label) between 1 and 60),
  token_hash           text not null unique,   -- sha256 of the token, used for lookup
  token_ciphertext     text not null,          -- lets the owner copy the link again
  visible_section_ids  uuid[] not null default '{}',
  show_status          boolean not null default true,
  show_links           boolean not null default false,
  show_stats           boolean not null default false,
  expires_at           timestamptz,
  revoked_at           timestamptz,
  view_count           int not null default 0,
  last_viewed_at       timestamptz,
  created_at           timestamptz not null default now()
);
create index share_links_project_idx on public.share_links (project_id);

create table public.share_views (
  id             bigint generated always as identity primary key,
  share_link_id  uuid not null references public.share_links (id) on delete cascade,
  project_id     uuid not null references public.projects (id) on delete cascade,
  owner_id       uuid not null references auth.users (id) on delete cascade,
  viewed_at      timestamptz not null default now()
);
create index share_views_project_time_idx on public.share_views (project_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- Keep child rows consistent with their project's owner
-- ---------------------------------------------------------------------------
create or replace function public.enforce_project_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_owner uuid;
begin
  select owner_id into project_owner from public.projects where id = new.project_id;
  if project_owner is null or project_owner <> new.owner_id then
    raise exception 'project does not belong to this user';
  end if;
  return new;
end;
$$;

create trigger sections_owner_check     before insert or update on public.sections     for each row execute function public.enforce_project_owner();
create trigger resources_owner_check    before insert or update on public.resources    for each row execute function public.enforce_project_owner();
create trigger integrations_owner_check before insert or update on public.integrations for each row execute function public.enforce_project_owner();
create trigger share_links_owner_check  before insert or update on public.share_links  for each row execute function public.enforce_project_owner();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.projects            enable row level security;
alter table public.sections            enable row level security;
alter table public.resources           enable row level security;
alter table public.integrations        enable row level security;
alter table public.integration_checks  enable row level security;
alter table public.share_links         enable row level security;
alter table public.share_views         enable row level security;

create policy "own profile" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own projects" on public.projects
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own sections" on public.sections
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own resources" on public.resources
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own integrations" on public.integrations
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own share links" on public.share_links
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Check history and view logs are written by the server only; owners can read.
create policy "read own checks" on public.integration_checks
  for select using (owner_id = (select auth.uid()));
create policy "read own share views" on public.share_views
  for select using (owner_id = (select auth.uid()));

-- Secret columns are never readable with the browser's key, even by the owner.
revoke select on public.integrations from anon, authenticated;
grant select (id, project_id, section_id, owner_id, provider, label, config, secret_hint,
              last_status, last_summary, last_details, last_checked_at, created_at)
  on public.integrations to authenticated;

revoke select on public.share_links from anon, authenticated;
grant select (id, project_id, owner_id, label, visible_section_ids, show_status, show_links,
              show_stats, expires_at, revoked_at, view_count, last_viewed_at, created_at)
  on public.share_links to authenticated;

revoke all on public.integration_checks, public.share_views from anon;
revoke insert, update, delete on public.integration_checks, public.share_views from authenticated;

-- Counting a share view happens through the server (service role).
create or replace function public.record_share_view(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.share_links%rowtype;
begin
  update public.share_links
     set view_count = view_count + 1, last_viewed_at = now()
   where id = p_link_id
  returning * into l;
  if found then
    insert into public.share_views (share_link_id, project_id, owner_id)
    values (l.id, l.project_id, l.owner_id);
  end if;
end;
$$;
revoke execute on function public.record_share_view(uuid) from public, anon, authenticated;
