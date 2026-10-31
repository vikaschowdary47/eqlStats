"use client";
import { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Check,
  FileUp,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import {
  parseCapture,
  readableFileSize,
  suggestProject,
  type CaptureItem,
  type CaptureProject,
} from "@/lib/capture";

export function SmartCapture({
  projects,
  currentProjectId,
  onSave,
}: {
  projects: CaptureProject[];
  currentProjectId?: string;
  onSave: (
    items: CaptureItem[],
  ) => Promise<{ saved: number; duplicates: number }>;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [review, setReview] = useState<CaptureItem[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const parsed = useMemo(() => parseCapture(text, projects), [text, projects]);
  const addFiles = (incoming: File[]) => {
    setError("");
    setNotice("");
    const next = [...files];
    let problem = "";
    for (const file of incoming) {
      if (file.size > 20 * 1024 * 1024) {
        problem = "Each file can be up to 20 MB. That file was not attached.";
        continue;
      }
      if (
        next.some(
          (f) =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified,
        )
      )
        continue;
      if (
        next.length >= 10 ||
        next.reduce((n, f) => n + f.size, 0) + file.size > 50 * 1024 * 1024
      ) {
        problem = "Attach up to 10 files, totaling 50 MB, at a time.";
        break;
      }
      next.push(file);
    }
    setFiles(next);
    setError(problem);
  };
  const prepare = async () => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const next = parsed.map((item) => ({
        ...item,
        projectId: item.projectId || currentProjectId || "",
      }));
      for (const [index, file] of files.entries()) {
        let body = `${file.name} · ${readableFileSize(file.size)}\nOriginal file saved on this device.`;
        const isText =
          /\.(?:txt|md|markdown|json|csv|log|ya?ml)$/i.test(file.name) ||
          file.type.startsWith("text/");
        if (isText && file.size <= 1024 * 1024) {
          try {
            const contents = await file.text();
            const fileProject = suggestProject(file.name, projects);
            for (const link of parseCapture(
              contents.slice(0, 20000),
              projects,
            ).filter((item) => item.url))
              next.push({
                ...link,
                id: `file-content:${index}:${link.id}`,
                projectId:
                  link.projectId || fileProject || currentProjectId || "",
                reason: `Found in ${file.name} · ${link.reason}`,
              });
            body += `\n\n${contents.slice(0, 20000)}${contents.length > 20000 ? "\n[Preview truncated. Original file is preserved.]" : ""}`;
          } catch {
            body +=
              "\nText preview unavailable. Original file will still be saved.";
          }
        }
        next.push({
          id: `file:${index}`,
          title: file.name,
          body,
          url: "",
          kind: "artifact",
          projectId:
            suggestProject(file.name, projects) || currentProjectId || "",
          reason:
            isText && file.size <= 1024 * 1024
              ? "Text file · original preserved with a readable preview"
              : "File attachment · original preserved; contents not interpreted",
          file,
        });
      }
      if (!next.length) {
        setError("Paste a link or a note, or attach a file first.");
        return;
      }
      setReview(next);
    } finally {
      setBusy(false);
    }
  };
  const change = (id: string, patch: Partial<CaptureItem>) =>
    setReview(
      (items) =>
        items?.map((item) => (item.id === id ? { ...item, ...patch } : item)) ||
        null,
    );
  const save = async () => {
    if (!review?.length) return;
    if (review.some((item) => !item.projectId || !item.title.trim())) {
      setError("Choose a project and a title for each item before saving.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await onSave(review);
      setReview(null);
      setText("");
      setFiles([]);
      setNotice(
        `${result.saved} ${result.saved === 1 ? "item" : "items"} saved${result.duplicates ? ` · ${result.duplicates} already saved` : ""}. Find them in your project sections.`,
      );
      textarea.current?.focus();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className={`smart-capture ${drag ? "capture-dragging" : ""}`}
      aria-labelledby="capture-title"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          setDrag(false);
          addFiles(Array.from(e.dataTransfer.files));
        }
      }}
    >
      <div className="capture-heading">
        <span className="capture-spark">
          <Sparkles size={19} />
        </span>
        <div>
          <h2 id="capture-title">Drop anything. Find it later.</h2>
          <p>
            Links, notes, files, half-formed ideas. We’ll help put them in the
            right place.
          </p>
        </div>
        <span className="capture-local">Your project inbox</span>
      </div>
      <label htmlFor="project-capture" className="sr-only">
        Paste project links, notes or decisions
      </label>
      <textarea
        ref={textarea}
        id="project-capture"
        disabled={busy}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setNotice("");
        }}
        maxLength={50000}
        placeholder="Paste a GitHub repo, a Figma file, console links, or anything you want to remember…"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            if (!busy) void prepare();
          }
        }}
        onPaste={(e) => {
          const pasted = Array.from(e.clipboardData.files);
          if (pasted.length) addFiles(pasted);
        }}
      />
      {files.length > 0 && (
        <ul className="capture-attachments">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <Paperclip size={13} />
              <span>
                {f.name} <small>{readableFileSize(f.size)}</small>
              </span>
              <button
                aria-label={`Remove ${f.name}`}
                disabled={busy}
                onClick={() => setFiles((old) => old.filter((_, n) => n !== i))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="capture-footer">
        <input
          ref={input}
          type="file"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Attach project files"
          onChange={(e) => {
            addFiles(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />
        <button
          className="capture-attach"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          <Paperclip size={16} />
          Attach files<span>or drop them here</span>
        </button>
        <span className="capture-found" aria-live="polite">
          {parsed.length + files.length > 0
            ? `${parsed.length + files.length} ${parsed.length + files.length === 1 ? "item" : "items"} to organize`
            : "Paste. Drop. Carry on."}
        </span>
        <button
          className="studio-button primary"
          disabled={busy || (!text.trim() && !files.length)}
          onClick={() => void prepare()}
        >
          {busy ? "Preparing…" : "Organize"}
          <ArrowRight size={15} />
        </button>
      </div>
      <p className="capture-footnote">
        Recognizes link types and project names on this device. You review
        before saving.
      </p>
      {!review && error && (
        <p className="capture-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="capture-success" role="status">
          <Check size={15} />
          {notice}
        </p>
      )}
      <Dialog.Root
        open={!!review}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setReview(null);
            setError("");
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="studio-overlay" />
          <Dialog.Content className="studio-dialog capture-review">
            <Dialog.Close
              className="dialog-close"
              aria-label="Close capture review"
              disabled={busy}
            >
              <X size={20} />
            </Dialog.Close>
            <span className="tiny-label">A PLACE FOR EVERYTHING</span>
            <Dialog.Title>Here’s what we found.</Dialog.Title>
            <Dialog.Description>
              Check the suggestions, choose a project, then save. No links are
              visited and no files leave this device.
            </Dialog.Description>
            <label className="capture-bulk">
              Assign every item to one project
              <select
                value=""
                disabled={busy}
                onChange={(e) => {
                  const projectId = e.target.value;
                  if (projectId)
                    setReview(
                      (items) =>
                        items?.map((item) => ({ ...item, projectId })) || null,
                    );
                }}
              >
                <option value="">Choose a project for all items…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="capture-review-items">
              {review?.map((item) => (
                <article key={item.id}>
                  <div className="capture-item-reason">
                    <span>
                      <FileUp size={15} />
                      {item.reason}
                    </span>
                    <button
                      aria-label={`Remove ${item.title} from review`}
                      disabled={busy}
                      onClick={() =>
                        setReview(
                          (items) =>
                            items?.filter((x) => x.id !== item.id) || null,
                        )
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <label>
                    Title
                    <input
                      value={item.title}
                      maxLength={120}
                      disabled={busy}
                      onChange={(e) =>
                        change(item.id, { title: e.target.value })
                      }
                    />
                  </label>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="capture-item-url"
                    >
                      {item.url}
                    </a>
                  )}
                  {item.body && (
                    <p className="capture-item-preview">{item.body}</p>
                  )}
                  <div className="capture-item-routing">
                    <label>
                      Save to project
                      <select
                        value={item.projectId}
                        disabled={busy}
                        onChange={(e) =>
                          change(item.id, { projectId: e.target.value })
                        }
                      >
                        <option value="">Choose a project…</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      As
                      <select
                        value={item.kind}
                        disabled={busy}
                        onChange={(e) =>
                          change(item.id, {
                            kind: e.target.value as CaptureItem["kind"],
                          })
                        }
                      >
                        <option value="note">Memory / note</option>
                        <option value="artifact">Artifact / reference</option>
                        <option value="decision">Decision</option>
                        <option value="service">Service / account</option>
                      </select>
                    </label>
                  </div>
                </article>
              ))}
            </div>
            {review?.length === 0 && (
              <p>
                All items removed. Close this review to continue your draft.
              </p>
            )}
            {projects.length === 0 && (
              <p>Create a project first, then come back to this draft.</p>
            )}
            {error && (
              <p className="capture-error" role="alert">
                {error}
              </p>
            )}
            <div className="capture-review-footer">
              <span>Links already in that project are skipped.</span>
              <button
                className="studio-button primary"
                disabled={busy || !review?.length || !projects.length}
                onClick={() => void save()}
              >
                {busy
                  ? "Saving…"
                  : `Save ${review?.length || 0} ${review?.length === 1 ? "item" : "items"}`}
                <Check size={16} />
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
