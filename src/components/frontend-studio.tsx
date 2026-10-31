"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Check,
  Code2,
  FileText,
  FolderOpen,
  Grid2X2,
  Link2,
  Network,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import {
  ProjectStudio,
  StudioShell,
  type StudioProject,
} from "./project-studio";

type Entry = {
  id: string;
  projectId: string;
  kind: "note" | "artifact" | "decision" | "service";
  title: string;
  body: string;
  url: string;
  pinned: boolean;
  createdAt: string;
};
type State = {
  projects: StudioProject[];
  entries: Entry[];
  name: string;
  github: string;
  mcp: string;
};
type View =
  | "projects"
  | "memory"
  | "services"
  | "artifacts"
  | "decisions"
  | "discover"
  | "connections"
  | "settings"
  | "project";
const nav = [
  { id: "projects", label: "Projects", icon: Grid2X2 },
  { id: "memory", label: "Project memory", icon: BookOpen },
  { id: "services", label: "Services & accounts", icon: Boxes },
  { id: "artifacts", label: "Artifacts", icon: FolderOpen },
  { id: "decisions", label: "Decisions", icon: FileText },
  { id: "discover", label: "GitHub discovery", icon: Code2 },
  { id: "connections", label: "Connections & MCP", icon: Network },
  { id: "settings", label: "Studio settings", icon: Settings2 },
] as const;
const key = "eqlstats.frontend-studio.v1";
const stamp = "2026-10-30T12:00:00Z";
const seedProjects: StudioProject[] = [
  {
    id: "equal-tab",
    name: "Equal Tab",
    description: "Less math at the table. More time with your people.",
    status: "ok",
    linkCount: 3,
    integrations: [
      {
        provider: "vercel",
        label: "Frontend",
        last_status: "ok",
        last_summary: "Sample: production is live.",
      },
      {
        provider: "supabase",
        label: "Database",
        last_status: "ok",
        last_summary: "Sample: project is healthy.",
      },
    ],
  },
  {
    id: "eqlstats",
    name: "eqlStats",
    description: "A home for everything behind what you’re building.",
    status: "warn",
    linkCount: 2,
    integrations: [
      {
        provider: "vercel",
        label: "Web app",
        last_status: "ok",
        last_summary: "Sample: deployment ready.",
      },
      {
        provider: "domain",
        label: "Project domain",
        last_status: "warn",
        last_summary: "Sample: renewal reminder.",
      },
    ],
  },
  {
    id: "fieldnotes",
    name: "Fieldnotes",
    description: "Small observations. The beginnings of bigger ideas.",
    status: "unknown",
    linkCount: 1,
    integrations: [],
  },
  {
    id: "orbit",
    name: "Orbit",
    description: "An experiment in keeping a little more in focus.",
    status: "unknown",
    linkCount: 0,
    integrations: [],
  },
].map((p) => ({
  ...p,
  website_url: null,
  created_at: stamp,
  updated_at: stamp,
})) as StudioProject[];
const seed: State = {
  projects: seedProjects,
  name: "Personal studio",
  github: "",
  mcp: "",
  entries: [
    {
      id: "n1",
      projectId: "equal-tab",
      kind: "note",
      title: "Where we left off",
      body: "Next: refine the split flow and make the settlement summary easier to scan. Keep the product calm and focused on the people at the table.",
      url: "",
      pinned: true,
      createdAt: stamp,
    },
    {
      id: "a1",
      projectId: "equal-tab",
      kind: "artifact",
      title: "Split flow exploration",
      body: "Interaction notes and wireframes for the next iteration.",
      url: "",
      pinned: false,
      createdAt: stamp,
    },
    {
      id: "d1",
      projectId: "equal-tab",
      kind: "decision",
      title: "Keep sign-up out of the first split",
      body: "Decision: let people create a split before asking for an account.\nWhy: the value should be clear before the commitment.\nRevisit: when collaborative editing is ready.",
      url: "",
      pinned: true,
      createdAt: stamp,
    },
    {
      id: "d2",
      projectId: "eqlstats",
      kind: "decision",
      title: "Defer EQL Share integration",
      body: "Build personal project memory first. Connect database and APIs after the frontend is reviewed. EQL Share integration remains deferred.",
      url: "",
      pinned: true,
      createdAt: stamp,
    },
    {
      id: "a2",
      projectId: "eqlstats",
      kind: "artifact",
      title: "Project studio direction",
      body: "Colorful project jackets, editorial typography and a spatial atlas. Motion should support orientation.",
      url: "",
      pinned: false,
      createdAt: stamp,
    },
    {
      id: "n2",
      projectId: "fieldnotes",
      kind: "note",
      title: "A place for the small things",
      body: "Capture the observations that might become the next project.",
      url: "",
      pinned: false,
      createdAt: stamp,
    },
  ],
};
const repositories = [
  {
    name: "equal-tab",
    description: "An easier way to split the bill.",
    language: "TypeScript",
    color: "#6d78ce",
  },
  {
    name: "eqlStats",
    description: "Personal project memory and service context.",
    language: "TypeScript",
    color: "#c28d54",
  },
  {
    name: "paperplane",
    description: "A small experiment waiting for its next chapter.",
    language: "JavaScript",
    color: "#a78dcb",
  },
];

export function FrontendStudio() {
  const [state, setState] = useState<State>(seed);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("projects");
  const [projectId, setProjectId] = useState("equal-tab");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [editor, setEditor] = useState<{
    kind: Entry["kind"] | "project";
    entry?: Entry;
  } | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed.projects) &&
          Array.isArray(parsed.entries) &&
          typeof parsed.name === "string"
        )
          setState(parsed);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        setStorageError(true);
      }
  }, [state, ready]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);
  const go = (next: View) => {
    setView(next);
    setQuery("");
    setScope("all");
  };
  const project =
    state.projects.find((p) => p.id === projectId) || state.projects[0];
  const openProject = (p: StudioProject) => {
    setProjectId(p.id);
    setTab("overview");
    go("project");
  };
  const update = (fn: (old: State) => State) => setState(fn);
  const kindForView: Record<string, Entry["kind"]> = {
    memory: "note",
    artifacts: "artifact",
    decisions: "decision",
    services: "service",
  };
  const saveEntry = (fd: FormData) => {
    if (!editor) return;
    const title = String(fd.get("title") || "").trim();
    if (!title) return;
    if (editor.kind === "project") {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const p: StudioProject = {
        id,
        name: title,
        description: String(fd.get("body") || ""),
        website_url: null,
        created_at: now,
        updated_at: now,
        status: "unknown",
        linkCount: 0,
        integrations: [],
      };
      update((s) => ({ ...s, projects: [p, ...s.projects] }));
      setEditor(null);
      openProject(p);
      setMessage("Project created in this browser.");
      return;
    }
    const id = editor.entry?.id || crypto.randomUUID();
    const entry: Entry = {
      id,
      kind: editor.kind,
      projectId: String(fd.get("projectId") || project?.id || ""),
      title,
      body: String(fd.get("body") || ""),
      url: String(fd.get("url") || ""),
      pinned: editor.entry?.pinned || false,
      createdAt: editor.entry?.createdAt || new Date().toISOString(),
    };
    update((s) => ({
      ...s,
      entries: editor.entry
        ? s.entries.map((e) => (e.id === id ? entry : e))
        : [entry, ...s.entries],
      projects: s.projects.map((p) =>
        p.id === entry.projectId
          ? { ...p, updated_at: new Date().toISOString() }
          : p,
      ),
    }));
    setEditor(null);
    setMessage("Saved in this browser.");
  };
  const projects = state.projects.map((p) => ({
    ...p,
    linkCount: state.entries.filter(
      (e) => e.projectId === p.id && e.kind !== "service",
    ).length,
    integrations: [
      ...p.integrations,
      ...state.entries
        .filter((e) => e.projectId === p.id && e.kind === "service")
        .map((e) => ({
          provider: "manual",
          label: e.title,
          last_status: "unknown" as const,
          last_summary: "Not connected. Saved locally.",
        })),
    ],
  }));
  const filteredEntries = (kind?: string, projectOnly = false) =>
    state.entries
      .filter(
        (e) =>
          (!kind || e.kind === kind) &&
          (!projectOnly || e.projectId === projectId) &&
          (scope === "all" || e.projectId === scope) &&
          `${e.title} ${e.body}`.toLowerCase().includes(query.toLowerCase()),
      )
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          b.createdAt.localeCompare(a.createdAt),
      );
  const newEntry = (kind: Entry["kind"]) =>
    state.projects.length
      ? setEditor({ kind })
      : setMessage("Create a project first.");
  const entryCards = (entries: Entry[]) =>
    entries.length ? (
      <div className="memory-grid">
        {entries.map((e) => (
          <motion.article
            layout
            key={e.id}
            className={`memory-card kind-${e.kind}`}
          >
            <div className="entry-meta">
              <span>
                {e.kind} ·{" "}
                {state.projects.find((p) => p.id === e.projectId)?.name}
              </span>
              <button
                aria-label={`${e.pinned ? "Unpin" : "Pin"} ${e.title}`}
                onClick={() =>
                  update((s) => ({
                    ...s,
                    entries: s.entries.map((x) =>
                      x.id === e.id ? { ...x, pinned: !x.pinned } : x,
                    ),
                  }))
                }
              >
                {e.pinned ? "Pinned" : "Pin"}
              </button>
            </div>
            <h2>{e.title}</h2>
            <p>{e.body}</p>
            {e.url && (
              <a href={e.url} target="_blank" rel="noreferrer">
                Open reference <ArrowUpRight size={14} />
              </a>
            )}
            <div className="entry-bottom">
              <span>
                {new Date(e.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "America/Chicago",
                })}
              </span>
              <button onClick={() => setEditor({ kind: e.kind, entry: e })}>
                Edit <ArrowRight size={13} />
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    ) : (
      <div className="studio-empty">
        <BookOpen size={30} />
        <h2>A little space for context.</h2>
        <p>
          {query
            ? "No matching items. Try another search."
            : "Save a thought, reference or decision to find it here later."}
        </p>
      </div>
    );
  const heading = (
    title: string,
    description: string,
    action?: () => void,
    label = "Add item",
  ) => (
    <div className="section-heading">
      <div>
        <span className="tiny-label">YOUR PERSONAL STUDIO</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && (
        <button className="studio-button primary" onClick={action}>
          <Plus size={17} />
          {label}
        </button>
      )}
    </div>
  );
  const toolbar = () => (
    <div className="collection-tools">
      <label className="studio-search">
        <Search size={16} />
        <input
          aria-label="Search saved items"
          placeholder="Search your context…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <label>
        <span className="sr-only">Filter by project</span>
        <select
          className="frontend-select"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="all">Every project</option>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
  return (
    <MotionConfig reducedMotion="user">
      <StudioShell
        preview
        name={state.name}
        breadcrumb={
          view === "project"
            ? project?.name
            : nav.find((n) => n.id === view)?.label
        }
        navigation={
          <>
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                className={`rail-link ${view === n.id ? "selected" : ""}`}
                aria-current={view === n.id ? "page" : undefined}
                title={n.label}
              >
                <n.icon size={18} />
                <span>{n.label}</span>
              </button>
            ))}
          </>
        }
      >
        <div className="frontend-mode">
          <span>
            <i />
            {storageError
              ? "Browser storage unavailable. Changes last for this session."
              : "Frontend workspace · changes saved in this browser"}
          </span>
          <span>Database & APIs later</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {view === "projects" && (
              <ProjectStudio
                preview
                projects={projects}
                onCreate={() => setEditor({ kind: "project" })}
                onOpen={openProject}
              />
            )}
            {["memory", "artifacts", "decisions"].includes(view) && (
              <>
                {heading(
                  view === "memory"
                    ? "Pick up the thread."
                    : view === "artifacts"
                      ? "The things that take shape."
                      : "Remember the why.",
                  view === "memory"
                    ? "Notes, setup context and the thoughts behind your projects."
                    : view === "artifacts"
                      ? "Designs, documents, builds and references. Keep the work close."
                      : "Record what you chose, what led there, and when to revisit it.",
                  () => newEntry(kindForView[view]),
                  view === "memory"
                    ? "Write a note"
                    : view === "artifacts"
                      ? "Add artifact"
                      : "Record decision",
                )}
                {toolbar()}
                {entryCards(filteredEntries(kindForView[view]))}
              </>
            )}
            {view === "services" && (
              <>
                {heading(
                  "Everything behind the scenes.",
                  "A directory of the services and accounts your projects rely on.",
                  () => newEntry("service"),
                  "Add service",
                )}
                {toolbar()}
                <div className="service-directory">
                  {projects
                    .filter((p) => scope === "all" || p.id === scope)
                    .flatMap((p) =>
                      p.integrations
                        .filter((i) =>
                          `${i.label} ${i.provider} ${p.name}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((i, n) => (
                          <article key={`${p.id}-${n}`}>
                            <span className="service-monogram">
                              {i.provider.slice(0, 1).toUpperCase()}
                            </span>
                            <div>
                              <h2>{i.label}</h2>
                              <p>
                                {p.name} · {i.provider}
                              </p>
                            </div>
                            <span className="connection-badge">
                              {i.provider === "manual"
                                ? "Saved locally"
                                : "Sample service"}
                            </span>
                            <button
                              aria-label={`Open ${p.name}`}
                              onClick={() => openProject(p)}
                            >
                              <ArrowUpRight size={18} />
                            </button>
                          </article>
                        )),
                    )}
                </div>
                <div className="context-banner">
                  <Boxes size={24} />
                  <div>
                    <h2>A directory now. Live context next.</h2>
                    <p>
                      Save account labels and console links. Authentication,
                      health checks and billing data will connect when the APIs
                      are ready. Do not enter API keys here.
                    </p>
                  </div>
                </div>
                {filteredEntries("service").length > 0 &&
                  entryCards(filteredEntries("service"))}
              </>
            )}
            {view === "project" && project && (
              <>
                <button className="back-link" onClick={() => go("projects")}>
                  <ArrowLeft size={15} />
                  All projects
                </button>
                {heading(
                  project.name,
                  project.description || "Your project, with all its context.",
                  () => setEditor({ kind: "note" }),
                  "Capture a note",
                )}
                <div
                  className="project-workspace-tabs"
                  role="group"
                  aria-label="Project sections"
                >
                  {[
                    "overview",
                    "memory",
                    "services",
                    "artifacts",
                    "decisions",
                    "settings",
                  ].map((t) => (
                    <button
                      key={t}
                      aria-pressed={tab === t}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {tab === "overview" ? (
                  <>
                    <div className="project-context-grid">
                      <article className="project-welcome">
                        <span className="tiny-label">BACK IN CONTEXT</span>
                        <h2>
                          Your next chapter
                          <br />
                          starts here.
                        </h2>
                        <p>
                          {state.entries.find(
                            (e) =>
                              e.projectId === project.id && e.kind === "note",
                          )?.body ||
                            "Capture a note to leave your future self a good starting point."}
                        </p>
                        <button
                          className="studio-button"
                          onClick={() => setEditor({ kind: "note" })}
                        >
                          Leave a note <Plus size={15} />
                        </button>
                      </article>
                      <article className="project-inventory">
                        <h2>In this project</h2>
                        {["note", "artifact", "decision", "service"].map(
                          (k) => (
                            <button
                              key={k}
                              onClick={() =>
                                setTab(
                                  k === "note"
                                    ? "memory"
                                    : k === "service"
                                      ? "services"
                                      : `${k}s`,
                                )
                              }
                            >
                              <span>
                                {k === "note"
                                  ? "Memory"
                                  : k === "service"
                                    ? "Services"
                                    : `${k}s`}
                              </span>
                              <strong>
                                {k === "service"
                                  ? projects.find((p) => p.id === project.id)
                                      ?.integrations.length
                                  : state.entries.filter(
                                      (e) =>
                                        e.projectId === project.id &&
                                        e.kind === k,
                                    ).length}
                              </strong>
                              <ArrowRight size={15} />
                            </button>
                          ),
                        )}
                      </article>
                    </div>
                    <div className="collection-heading">
                      <h2>On the workbench</h2>
                      <button onClick={() => setEditor({ kind: "artifact" })}>
                        Add artifact <Plus size={15} />
                      </button>
                    </div>
                    {entryCards(filteredEntries(undefined, true))}
                  </>
                ) : tab === "settings" ? (
                  <form
                    className="frontend-form settings-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      update((s) => ({
                        ...s,
                        projects: s.projects.map((p) =>
                          p.id === project.id
                            ? {
                                ...p,
                                name: String(fd.get("name")).trim(),
                                description: String(fd.get("description")),
                                updated_at: new Date().toISOString(),
                              }
                            : p,
                        ),
                      }));
                      setMessage("Project details saved locally.");
                    }}
                  >
                    <h2>Project details</h2>
                    <label>
                      Name
                      <input
                        name="name"
                        defaultValue={project.name}
                        required
                        maxLength={80}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        name="description"
                        defaultValue={project.description || ""}
                        maxLength={280}
                      />
                    </label>
                    <button className="studio-button primary">
                      Save details
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="collection-heading">
                      <h2>{tab}</h2>
                      <button onClick={() => newEntry(kindForView[tab])}>
                        Add {tab === "memory" ? "note" : tab.slice(0, -1)}{" "}
                        <Plus size={15} />
                      </button>
                    </div>
                    {tab === "services" && (
                      <div className="service-directory">
                        {projects
                          .find((p) => p.id === project.id)
                          ?.integrations.map((i, n) => (
                            <article key={n}>
                              <span className="service-monogram">
                                {i.provider[0].toUpperCase()}
                              </span>
                              <div>
                                <h2>{i.label}</h2>
                                <p>{i.last_summary}</p>
                              </div>
                              <span className="connection-badge">
                                {i.provider === "manual"
                                  ? "Not connected"
                                  : "Sample"}
                              </span>
                            </article>
                          ))}
                      </div>
                    )}
                    {entryCards(filteredEntries(kindForView[tab], true))}
                  </>
                )}
              </>
            )}
            {view === "discover" && (
              <>
                {heading(
                  "Find your next starting point.",
                  "Bring a repository into your project studio. Review the discovery flow with sample repositories.",
                )}
                <div className="discovery-hero">
                  <Code2 size={34} />
                  <div>
                    <span className="tiny-label">GITHUB DISCOVERY</span>
                    <h2>
                      Your code is a starting point.
                      <br />
                      Build the context around it.
                    </h2>
                    <p>
                      Repository import is a frontend simulation. No GitHub
                      account is connected and no repositories are fetched or
                      changed.
                    </p>
                  </div>
                  <button
                    className="studio-button"
                    onClick={() => go("connections")}
                  >
                    Set up later <ArrowRight size={16} />
                  </button>
                </div>
                <label className="studio-search discovery-search">
                  <Search size={17} />
                  <input
                    aria-label="Search sample repositories"
                    placeholder="Search sample repositories…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <div className="repo-grid">
                  {repositories
                    .filter((r) =>
                      r.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((r) => (
                      <article key={r.name}>
                        <div className="repo-top">
                          <Code2 size={20} />
                          <span>Sample repository</span>
                        </div>
                        <h2>{r.name}</h2>
                        <p>{r.description}</p>
                        <span className="repo-language">
                          <i style={{ background: r.color }} />
                          {r.language}
                        </span>
                        <button
                          className="studio-button"
                          disabled={state.projects.some(
                            (p) =>
                              p.id === r.name ||
                              p.name.toLowerCase() === r.name.toLowerCase(),
                          )}
                          onClick={() => {
                            const now = new Date().toISOString();
                            const p: StudioProject = {
                              id: crypto.randomUUID(),
                              name: r.name,
                              description: r.description,
                              created_at: now,
                              updated_at: now,
                              website_url: null,
                              integrations: [],
                              linkCount: 0,
                              status: "unknown",
                            };
                            update((s) => ({
                              ...s,
                              projects: [p, ...s.projects],
                            }));
                            setMessage(
                              "Sample repository added as a local project.",
                            );
                          }}
                        >
                          {state.projects.some(
                            (p) =>
                              p.id === r.name ||
                              p.name.toLowerCase() === r.name.toLowerCase(),
                          ) ? (
                            <>
                              <Check size={15} />
                              Already in studio
                            </>
                          ) : (
                            <>
                              Add to studio <Plus size={15} />
                            </>
                          )}
                        </button>
                      </article>
                    ))}
                </div>
                <button
                  className="back-link"
                  onClick={() => setEditor({ kind: "project" })}
                >
                  Start with a different repository or idea{" "}
                  <ArrowRight size={15} />
                </button>
              </>
            )}
            {view === "connections" && (
              <>
                {heading(
                  "Connected, on your terms.",
                  "Prepare the places your project context will come from. No credentials needed yet.",
                )}
                <div className="connection-grid">
                  {[
                    {
                      id: "github",
                      title: "GitHub",
                      icon: Code2,
                      description:
                        "Discover repositories and bring their context into your studio.",
                      label: "GitHub username",
                      placeholder: "Your username",
                    },
                    {
                      id: "mcp",
                      title: "MCP",
                      icon: Network,
                      description:
                        "Let future tools work with the project context you choose.",
                      label: "Connection label",
                      placeholder: "Personal tools",
                    },
                  ].map((c) => (
                    <form
                      key={c.id}
                      className="connection-card frontend-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const value = String(
                          new FormData(e.currentTarget).get("value") || "",
                        );
                        update((s) => ({ ...s, [c.id]: value }));
                        setMessage(
                          "Preference saved. API connection is still deferred.",
                        );
                      }}
                    >
                      <div className="connection-card-top">
                        <c.icon size={28} />
                        <span className="connection-badge">Not connected</span>
                      </div>
                      <h2>{c.title}</h2>
                      <p>{c.description}</p>
                      <label>
                        {c.label}
                        <input
                          name="value"
                          defaultValue={state[c.id as "github" | "mcp"]}
                          placeholder={c.placeholder}
                          maxLength={100}
                        />
                      </label>
                      <button className="studio-button">Save preference</button>
                      <small>
                        Frontend only. No authentication or network connection.
                      </small>
                    </form>
                  ))}
                </div>
                <div className="context-banner">
                  <Link2 size={24} />
                  <div>
                    <h2>EQL Share comes later.</h2>
                    <p>
                      Personal memory and project context come first. EQL Share
                      integration is deferred.
                    </p>
                  </div>
                </div>
              </>
            )}
            {view === "settings" && (
              <>
                {heading(
                  "Make yourself at home.",
                  "A few details for your personal project studio.",
                )}
                <form
                  className="frontend-form settings-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = String(
                      new FormData(e.currentTarget).get("name") || "",
                    ).trim();
                    if (value) update((s) => ({ ...s, name: value }));
                    setMessage("Workspace name saved locally.");
                  }}
                >
                  <h2>Workspace identity</h2>
                  <label>
                    Workspace name
                    <input
                      name="name"
                      defaultValue={state.name}
                      required
                      maxLength={60}
                    />
                  </label>
                  <p>
                    Your changes are stored in this browser. They do not sync to
                    an account, database or another device.
                  </p>
                  <button className="studio-button primary">
                    Save changes
                  </button>
                </form>
                <div className="context-banner">
                  <BookOpen size={24} />
                  <div>
                    <h2>Your working copy</h2>
                    <p>
                      {state.projects.length} projects · {state.entries.length}{" "}
                      saved items. Sample content is included for review. No API
                      keys, passwords or sensitive account details belong in
                      this frontend prototype.
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <Dialog.Root
          open={!!editor}
          onOpenChange={(open) => {
            if (!open) setEditor(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="studio-overlay" />
            <Dialog.Content className="studio-dialog">
              <Dialog.Close className="dialog-close" aria-label="Close editor">
                <X size={20} />
              </Dialog.Close>
              <span className="tiny-label">A LITTLE MORE CONTEXT</span>
              <Dialog.Title>
                {editor?.entry
                  ? "Edit"
                  : editor?.kind === "project"
                    ? "New"
                    : "Add"}{" "}
                {editor?.kind}
              </Dialog.Title>
              <Dialog.Description>
                Saved in this browser. Database and API connections come later.
              </Dialog.Description>
              <form
                key={editor?.entry?.id || editor?.kind}
                className="frontend-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEntry(new FormData(e.currentTarget));
                }}
              >
                <label>
                  {editor?.kind === "project" ? "Project name" : "Title"}
                  <input
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={editor?.entry?.title || ""}
                    placeholder={
                      editor?.kind === "project"
                        ? "Your next big idea"
                        : "Give it a name"
                    }
                  />
                </label>
                {editor?.kind !== "project" && (
                  <label>
                    Project
                    <select
                      name="projectId"
                      defaultValue={
                        editor?.entry?.projectId ||
                        (view === "project" ? projectId : state.projects[0]?.id)
                      }
                      required
                    >
                      {state.projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  {editor?.kind === "decision"
                    ? "Decision, reasoning & revisit point"
                    : "Context"}
                  <textarea
                    name="body"
                    maxLength={5000}
                    rows={4}
                    defaultValue={editor?.entry?.body || ""}
                    placeholder={
                      editor?.kind === "decision"
                        ? "What did you choose, and why?"
                        : "What should your future self know?"
                    }
                  />
                </label>
                {["artifact", "service"].includes(editor?.kind || "") && (
                  <label>
                    Reference URL (optional)
                    <input
                      name="url"
                      type="url"
                      pattern="https?://.*"
                      placeholder="https://"
                      defaultValue={editor?.entry?.url || ""}
                    />
                  </label>
                )}
                <button className="studio-button primary">
                  {editor?.kind === "project"
                    ? "Create project"
                    : "Save to project"}
                  <ArrowRight size={16} />
                </button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <div className="studio-toast" role="status" aria-live="polite">
          {message && (
            <span>
              <Check size={16} />
              {message}
            </span>
          )}
        </div>
      </StudioShell>
    </MotionConfig>
  );
}
