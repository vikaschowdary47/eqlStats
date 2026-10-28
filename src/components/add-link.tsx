"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { addResource } from "@/app/(app)/actions";
import { monogram, recognize } from "@/lib/recognize";
import type { Section } from "@/lib/types";
import { FormMessage, inputClass, cx } from "./ui";
import { SubmitButton } from "./forms";

/**
 * Paste a console URL and it's recognised as you type:
 * "console.cloud.google.com/apis/api/gmail.googleapis.com/credentials" → "Gmail API · Credentials", Backend.
 */
export function AddLink({ projectId, sections }: { projectId: string; sections: Pick<Section, "id" | "name" | "kind">[] }) {
  const [state, action] = useActionState(addResource, undefined);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [section, setSection] = useState("");
  const [withNote, setWithNote] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const rec = useMemo(() => recognize(url), [url]);
  const suggested = rec ? sections.find((s) => s.kind === rec.section)?.id ?? "" : "";

  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      setUrl("");
      setTitle("");
      setSection("");
      setWithNote(false);
      input.current?.focus();
    }
  }, [state]);

  // Press "/" anywhere on the page to jump to the link box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form ref={form} action={action} className="rounded-xl bg-surface p-3 ring-1 ring-line sm:p-4">
      <input type="hidden" name="project_id" value={projectId} />
      <label htmlFor="add-url" className="sr-only">
        Paste a link
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={input}
          id="add-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a console link: Google Cloud, Vercel, Supabase, Stripe…"
          className={cx(inputClass, "h-11 font-mono text-[14px]")}
        />
        <SubmitButton pending="Saving…" className="h-11 sm:w-28">
          Save
        </SubmitButton>
      </div>

      {rec ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr_200px] sm:items-center">
          <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-sunk font-mono text-[12px] font-semibold text-ink-2">
            {monogram(rec.providerName)}
          </span>
          <div className="min-w-0">
            <label htmlFor="add-title" className="sr-only">
              Title
            </label>
            <input
              id="add-title"
              name="title"
              value={title || rec.title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full truncate bg-transparent text-[15px] font-medium text-ink focus:outline-none"
            />
            <p className="truncate text-[13px] text-ink-3">
              {rec.providerName}
              {rec.context ? `, ${rec.context}` : ""}
            </p>
          </div>
          <div>
            <label htmlFor="add-section" className="sr-only">
              Section
            </label>
            <select
              id="add-section"
              name="section_id"
              value={section || suggested}
              onChange={(e) => setSection(e.target.value)}
              className={cx(inputClass, "h-9 py-1 text-sm")}
            >
              <option value="">Unsorted</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setWithNote((v) => !v)} className="text-[13px] font-medium text-ink-2 hover:text-ink">
          {withNote ? "Remove note" : "Add a note"}
        </button>
        <span className="hidden text-[12px] text-ink-3 sm:inline">
          Press <kbd className="rounded bg-sunk px-1.5 py-0.5 font-mono text-[11px]">/</kbd> to paste from anywhere
        </span>
      </div>
      {withNote ? (
        <textarea
          name="note"
          aria-label="Note"
          placeholder="Redirect URI is https://…/callback. Scopes: gmail.send, gmail.readonly."
          className={cx(inputClass, "mt-2 min-h-20 text-sm")}
        />
      ) : null}
      <div className="mt-2 empty:hidden">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
