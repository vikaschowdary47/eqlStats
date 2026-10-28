"use client";

import { useState } from "react";
import { addIntegration } from "@/app/(app)/actions";
import { PROVIDERS } from "@/lib/integrations/providers";
import type { Section } from "@/lib/types";
import { ActionForm, SubmitButton } from "./forms";
import { Field, Input, Select, cx } from "./ui";

export function IntegrationForm({ projectId, sections }: { projectId: string; sections: Pick<Section, "id" | "name" | "kind">[] }) {
  const [providerId, setProviderId] = useState(PROVIDERS[0].id);
  const spec = PROVIDERS.find((p) => p.id === providerId)!;
  const defaultSection = sections.find((s) => s.kind === spec.section)?.id ?? "";

  return (
    <ActionForm action={addIntegration} className="space-y-6">
      <input type="hidden" name="project_id" value={projectId} />
      <fieldset>
        <legend className="text-sm font-medium">Service</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup">
          {PROVIDERS.map((p) => (
            <label
              key={p.id}
              className={cx(
                "cursor-pointer rounded-lg px-3 py-2.5 ring-1 ring-inset transition-colors",
                p.id === providerId ? "bg-ink text-bg ring-ink" : "bg-surface ring-line-strong hover:bg-sunk",
              )}
            >
              <input type="radio" name="provider" value={p.id} checked={p.id === providerId} onChange={() => setProviderId(p.id)} className="sr-only" />
              <span className="block text-[14px] font-medium">{p.name}</span>
              <span className={cx("block text-[12.5px] leading-snug", p.id === providerId ? "text-bg/70" : "text-ink-3")}>{p.blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div key={spec.id} className="grid gap-5 sm:grid-cols-2">
        {spec.fields
          .filter((f) => f.type !== "checkbox")
          .map((f) => (
            <Field key={f.key} label={f.optional ? `${f.label} (optional)` : f.label} htmlFor={`f-${f.key}`} help={f.help}>
              <Input id={`f-${f.key}`} name={f.key} placeholder={f.placeholder} required={!f.optional} autoComplete="off" spellCheck={false} className="font-mono text-[14px]" />
            </Field>
          ))}

        {spec.secret ? (
          <Field
            label={spec.secret.label}
            htmlFor="f-secret"
            help={
              <>
                {spec.secret.help}{" "}
                <a href={spec.secret.createUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                  Create one
                </a>
                . Encrypted before it&apos;s stored, and never shown again.
              </>
            }
          >
            <Input id="f-secret" name="secret" type="password" required autoComplete="off" spellCheck={false} className="font-mono text-[14px]" />
          </Field>
        ) : null}

        <Field label="Name on dashboard (optional)" htmlFor="f-label">
          <Input id="f-label" name="label" maxLength={80} placeholder={`${spec.name} · production`} />
        </Field>
        <Field label="Section" htmlFor="f-section">
          <Select id="f-section" name="section_id" defaultValue={defaultSection}>
            <option value="">None</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        {spec.fields
          .filter((f) => f.type === "checkbox")
          .map((f) => (
            <label key={f.key} className="flex items-start gap-3 sm:col-span-2">
              <input type="checkbox" name={f.key} className="switch mt-0.5" />
              <span>
                <span className="block text-sm font-medium">{f.label}</span>
                {f.help ? <span className="block text-[13px] text-ink-3">{f.help}</span> : null}
              </span>
            </label>
          ))}
      </div>

      <SubmitButton pending="Connecting and checking…">Connect {spec.name}</SubmitButton>
    </ActionForm>
  );
}
