"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Circle,
  Command,
  Grid2X2,
  Layers,
  Map,
  Plus,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import type { Project, Status } from "@/lib/types";
import { STATUS_LABEL } from "./ui";

export type StudioProject = Project & {
  status: Status;
  linkCount: number;
  integrations: {
    provider: string;
    label: string;
    last_status: Status;
    last_summary: string | null;
  }[];
};
const themes = ["apricot", "lilac", "cobalt", "mint", "rose", "butter"];
function themeFor(id: string) {
  return themes[
    [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % themes.length
  ];
}

export function StudioShell({
  children,
  name = "Personal workspace",
  preview = false,
  navigation,
  breadcrumb = "Projects",
}: {
  navigation?: React.ReactNode;
  breadcrumb?: string;
  children: React.ReactNode;
  name?: string;
  preview?: boolean;
}) {
  const path = usePathname();
  return (
    <div className="studio-shell">
      <a href="#studio-main" className="studio-skip">
        Skip to content
      </a>
      <aside className="studio-rail">
        <Link
          prefetch={false}
          href={preview ? "/studio-preview" : "/dashboard"}
          className="studio-brand"
        >
          <span className="brand-symbol">=</span>eqlStats
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar" aria-hidden="true">
            ✳
          </span>
          <div>
            <strong>Personal studio</strong>
            <small>Your ideas, connected.</small>
          </div>
        </div>
        <nav aria-label="Workspace">
          {navigation || (
            <>
              <Link
                prefetch={false}
                className={`rail-link ${["/dashboard", "/studio-preview"].includes(path) ? "selected" : ""}`}
                aria-current={
                  ["/dashboard", "/studio-preview"].includes(path)
                    ? "page"
                    : undefined
                }
                href={preview ? "/studio-preview" : "/dashboard"}
              >
                <Grid2X2 size={18} />
                Projects
                <ArrowUpRight size={15} />
              </Link>
              <Link
                prefetch={false}
                className="rail-link"
                href={preview ? "/login" : "/projects/new"}
              >
                <Plus size={18} />
                New project
              </Link>
              <Link
                className="rail-link"
                href={preview ? "/login" : "/settings"}
              >
                <Settings2 size={18} />
                Account & settings
              </Link>
            </>
          )}
        </nav>
        {navigation && (
          <details
            className="studio-mobile-menu"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button"))
                e.currentTarget.open = false;
            }}
          >
            <summary>
              Explore studio <Layers size={16} />
            </summary>
            <nav aria-label="Explore studio">{navigation}</nav>
          </details>
        )}
        <div className="rail-note">
          <span className="tiny-label">A little less searching.</span>
          <p>
            A little more
            <br />
            <em>making.</em>
          </p>
          <div className="note-orbit" aria-hidden="true">
            ✳
          </div>
        </div>
        <div className="rail-bottom">
          <span className="workspace-avatar">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span className="account-name">
            {name}
            <small>{preview ? "Design preview" : "Personal workspace"}</small>
          </span>
          {!preview && (
            <form action="/auth/signout" method="post">
              <button aria-label="Sign out" title="Sign out">
                <ArrowUpRight size={18} />
              </button>
            </form>
          )}
        </div>
      </aside>
      <div className="studio-body">
        <header className="studio-topbar">
          <span>
            <span className="topbar-home">Workspace</span>
            <span className="topbar-divider">/</span>
            {breadcrumb}
          </span>
          <span className="private-label">
            <Circle size={8} fill="currentColor" />
            {preview
              ? "Sample workspace · no live data"
              : "Your private corner of the internet"}
          </span>
        </header>
        <main id="studio-main" className="studio-main">
          {children}
        </main>
      </div>
    </div>
  );
}

export function ProjectStudio({
  projects,
  preview = false,
  onCreate,
  onOpen,
}: {
  onCreate?: () => void;
  onOpen?: (project: StudioProject) => void;
  projects: StudioProject[];
  preview?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("gallery");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<StudioProject | null>(null);
  const visible = useMemo(
    () =>
      projects
        .filter((p) =>
          `${p.name} ${p.description ?? ""} ${p.integrations.map((i) => i.label).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .filter(
          (p) => filter !== "attention" || ["warn", "down"].includes(p.status),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name)
            : b.updated_at.localeCompare(a.updated_at),
        ),
    [projects, query, filter, sort],
  );
  const attention = projects.filter((p) =>
    ["warn", "down"].includes(p.status),
  ).length;
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 270, damping: 28 }}
    >
      <div className="studio-heading">
        <div>
          <div className="tiny-label heading-kicker">
            <span /> THE PROJECT STUDIO
          </div>
          <h1>
            Good ideas deserve
            <br />a place to <em>grow.</em>
            <Sparkles aria-hidden="true" className="heading-spark" />
          </h1>
          <p>
            Everything behind what you’re building. Right where you left it.
          </p>
        </div>
        <Link
          prefetch={false}
          className="studio-button primary"
          href={
            onCreate ? "#new-project" : preview ? "/login" : "/projects/new"
          }
          onClick={
            onCreate
              ? (e) => {
                  e.preventDefault();
                  onCreate();
                }
              : undefined
          }
        >
          <Plus size={18} />
          New project
        </Link>
      </div>
      <section className="studio-summary" aria-label="Workspace summary">
        <span>
          <strong>{String(projects.length).padStart(2, "0")}</strong> projects
          in your orbit
        </span>
        <span>
          <span className="summary-dot" />
          {attention
            ? `${attention} ${attention === 1 ? "project needs" : "projects need"} attention`
            : "Room for your next big thing"}
        </span>
        <span className="summary-end">
          A home for the whole picture <ArrowDownUp size={14} />
        </span>
      </section>
      <Tabs.Root value={filter} onValueChange={setFilter}>
        <div className="studio-toolbar">
          <Tabs.List aria-label="Filter projects" className="studio-tabs">
            <Tabs.Trigger value="all">
              All projects <span>{projects.length}</span>
            </Tabs.Trigger>
            <Tabs.Trigger value="attention">
              Needs a look <span>{attention}</span>
            </Tabs.Trigger>
          </Tabs.List>
          <div className="studio-tools">
            <label className="studio-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a project…"
                aria-label="Find a project"
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </label>
            <label className="sort-control">
              <span className="sr-only">Sort projects</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">Last edited</option>
                <option value="name">A to Z</option>
              </select>
            </label>
            <div className="view-toggle" role="group" aria-label="Project view">
              <button
                aria-label="Gallery view"
                aria-pressed={view === "gallery"}
                onClick={() => setView("gallery")}
              >
                <Grid2X2 size={17} />
              </button>
              <button
                aria-label="Atlas view"
                aria-pressed={view === "atlas"}
                onClick={() => setView("atlas")}
              >
                <Map size={18} />
              </button>
            </div>
          </div>
        </div>
        <Tabs.Content value={filter}>
          <div aria-live="polite" className="sr-only">
            {visible.length} projects shown
          </div>
          <motion.div
            layout
            className={`project-gallery ${view === "atlas" ? "project-atlas" : ""}`}
          >
            <AnimatePresence mode="popLayout">
              {visible.map((p, index) => (
                <motion.article
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: Math.min(index * 0.035, 0.2) }}
                  key={p.id}
                  className={`project-card theme-${themeFor(p.id)}`}
                >
                  <button
                    className="project-cover"
                    onClick={() => setSelected(p)}
                    aria-label={`Quick look at ${p.name}`}
                  >
                    <span className="cover-top">
                      <span className="cover-category">PROJECT MEMORY</span>
                      <ArrowUpRight size={19} />
                    </span>
                    <div className="project-art" aria-hidden="true">
                      <div className="art-shape shape-one" />
                      <div className="art-shape shape-two" />
                      <span>{p.name.slice(0, 1)}</span>
                    </div>
                    <span className="cover-bottom">
                      <span>
                        {p.integrations.length
                          ? p.integrations
                              .slice(0, 3)
                              .map((i) => i.provider)
                              .join(" + ")
                          : "A new idea taking shape"}
                      </span>
                      <span className="cover-mark">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </span>
                  </button>
                  <div className="project-caption">
                    <div className="caption-title">
                      <Link
                        prefetch={false}
                        href={preview ? "#" : `/projects/${p.id}`}
                        onClick={
                          preview
                            ? (e) => {
                                e.preventDefault();
                                onOpen ? onOpen(p) : setSelected(p);
                              }
                            : undefined
                        }
                      >
                        {p.name}
                        <ArrowUpRight size={17} />
                      </Link>
                      <span className={`project-status status-${p.status}`}>
                        <i />
                        {STATUS_LABEL[p.status]}
                      </span>
                    </div>
                    <p>
                      {p.description ||
                        "A place for the links, notes and services behind your next idea."}
                    </p>
                    <div className="caption-meta">
                      <span>
                        <Layers size={13} />
                        {p.integrations.length}{" "}
                        {p.integrations.length === 1 ? "service" : "services"}
                      </span>
                      <span>
                        <BookOpen size={13} />
                        {p.linkCount} saved{" "}
                        {p.linkCount === 1 ? "item" : "items"}
                      </span>
                      <button
                        onClick={() => setSelected(p)}
                        aria-label={`Quick look at ${p.name}`}
                      >
                        Quick look <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
            {!query && filter === "all" && (
              <Link
                prefetch={false}
                href={
                  onCreate
                    ? "#new-project"
                    : preview
                      ? "/login"
                      : "/projects/new"
                }
                onClick={
                  onCreate
                    ? (e) => {
                        e.preventDefault();
                        onCreate();
                      }
                    : undefined
                }
                className="new-project-card"
              >
                <span className="new-project-icon">
                  <Plus size={26} />
                </span>
                <h2>What’s next?</h2>
                <p>
                  A side project. A big bet.
                  <br />
                  Give it a little space.
                </p>
                <span>
                  Start something <ArrowUpRight size={16} />
                </span>
              </Link>
            )}
          </motion.div>
          {visible.length === 0 && (query || filter !== "all") && (
            <div className="studio-empty">
              <Search size={30} />
              <h2>No projects here just yet.</h2>
              <p>Try another search, or come back to all your projects.</p>
              <button
                className="studio-button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Show all projects
              </button>
            </div>
          )}
          <footer className="studio-footer">
            <span>Less scattered. More connected.</span>
            <span>
              Built around your projects <span aria-hidden="true">✳</span>
            </span>
          </footer>
        </Tabs.Content>
      </Tabs.Root>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="studio-overlay" />
          <Dialog.Content
            className="studio-dialog"
            aria-describedby="project-description"
          >
            <Dialog.Close
              className="dialog-close"
              aria-label="Close quick look"
            >
              <X size={21} />
            </Dialog.Close>
            {selected && (
              <>
                <span className="tiny-label">BACK IN CONTEXT</span>
                <Dialog.Title>{selected.name}</Dialog.Title>
                <Dialog.Description id="project-description">
                  {selected.description || "Your project memory starts here."}
                </Dialog.Description>
                <div className="quick-stats">
                  <span>
                    <Boxes />
                    {selected.integrations.length}{" "}
                    {selected.integrations.length === 1
                      ? "service"
                      : "services"}
                  </span>
                  <span>
                    <BookOpen />
                    {selected.linkCount} saved{" "}
                    {selected.linkCount === 1 ? "item" : "items"}
                  </span>
                </div>
                <h3>Connected services</h3>
                {selected.integrations.length ? (
                  <ul className="quick-services">
                    {selected.integrations.map((i, n) => (
                      <li key={n}>
                        <span>
                          {i.label}
                          <small>
                            {i.last_summary || STATUS_LABEL[i.last_status]}
                          </small>
                        </span>
                        <span
                          className={`project-status status-${i.last_status}`}
                        >
                          <i />
                          {STATUS_LABEL[i.last_status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Connect services inside the project to keep its
                    infrastructure close.
                  </p>
                )}
                <div className="memory-note">
                  <Command size={18} />
                  <p>
                    Keep console links, setup notes, artifacts and decisions
                    together in your project sections.
                  </p>
                </div>
                {preview ? (
                  <p className="preview-notice">
                    {onOpen
                      ? "Frontend working copy. Changes stay in this browser."
                      : "Illustrative sample project. Sign in to work with your own data."}
                  </p>
                ) : null}
                <Link
                  prefetch={false}
                  className="studio-button primary"
                  href={
                    onOpen
                      ? "#project"
                      : preview
                        ? "/login"
                        : `/projects/${selected.id}`
                  }
                  onClick={
                    onOpen
                      ? (e) => {
                          e.preventDefault();
                          setSelected(null);
                          onOpen(selected);
                        }
                      : undefined
                  }
                >
                  {preview && !onOpen ? "Open your workspace" : "Open project"}
                  <ArrowRight size={17} />
                </Link>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </MotionConfig>
  );
}
