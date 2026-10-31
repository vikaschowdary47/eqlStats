# eqlStats project studio

## Brief and constraints

Personal project memory for a developer: services/accounts, saved resources, notes, artifacts and decisions. Next.js/React/Supabase remain. No migrations or changes to main. EQL Share integration deferred. Existing read-only sharing stays intact. GitHub discovery and MCP are future integrations, not presented as working connections.

## Concept selection

Three territories considered: project jackets (material), a constellation of services (spatial), a chronological working journal (process). Scores originality/fit/feasibility/portability: jackets 4/5/5/2; constellation 4/4/3/3; journal 3/4/5/3. Choose project jackets with an alternate atlas arrangement: each project has a recognizable cover and opens into its working context.

Idea: Every project gets a recognizable place to return to.
Metaphor: A personal studio shelf, opening into a project atlas.
Signature: Motion layout transitions between cover gallery and spatial atlas, with Radix quick look.
Emotion: Calm, optimistic, personal.
Motion verb: Lift and settle.
Screenshot: Large editorial greeting above colorful project covers on a quiet pale ground.

## System

Ground #f7f8fa; ink #242831; muted #59606d; line #e2e5eb; lavender #c8bae9; cobalt #4d65ce. Additional cover colors apricot/mint/rose/butter are stable hashes of project IDs, without schema changes. Existing Bricolage Grotesque display and Instrument Sans body via next/font. Georgia italic adds editorial contrast without another download.
Desktop: 224px rail, 42px content inset, three project columns; tablet two; phone one intentionally composed column. Covers 12px radius, controls 8px. Motion spring stiffness 270/damping 28; short stagger on project entry and layout continuity on filter/sort/view. Motion respects reduced motion; CSS hover effects also disabled when requested. Still at rest is intentional for a tool used for sustained work. No WebGL or extra animation engine is needed.

Composition: rail | breadcrumb / oversized two-line title + creation action / compact real counts / filters + search / project jacket gallery / quiet footer. Atlas becomes two staggered columns on a dotted surface, one column on mobile. Quick look is a modal layer with focus trapping, Escape, accessible title and description, and real project/service context.

Genericness check: remove KPI tiles and generic dashboard charts. Use project-specific covers and a typographic greeting; health remains a secondary, textual signal.

## Data and preview

Authenticated dashboard uses existing listProjects and RLS. Preview at /studio-preview contains explicitly illustrative sample records and no Supabase calls. Only this static preview is excluded from session refresh. No live records are inserted or modified by preview. Search/filter/sort/view are ephemeral UI state. Creation and project navigation retain existing server workflows. No fake GitHub/MCP connection controls.

## Frontend expansion

The user subsequently requested the full frontend now, with database and APIs later. `/studio-preview` now includes a complete browser-local workspace: create projects, edit project details, notes, artifact references, decision records, service/account context, cross-project search/filter, pin/edit, sample GitHub repository discovery/import, connection preferences, and studio identity settings. State is stored under `eqlstats.frontend-studio.v1` in localStorage. Every connection stays explicitly disconnected; sample health is labeled as sample data. The existing authenticated application and Supabase data path remain available separately.

The first screenshot-only independent review scored design 8.2, usability 7.4, creativity 7.5, content 7.8. Applied both requested changes: larger secondary text/touch controls and more differentiated cover geometry/type placement. No claim of measured performance or full accessibility certification is made.

## Capture as the front door
A visible, full-width Drop anything inbox sits above page content throughout the frontend studio. A lavender navigation action returns focus to it from long pages. Plain language explains paste/drop/attach, and an editable review makes routing understandable. Current-project context supplies a default; recognizable names suggest projects; ambiguous inputs require a choice. Batch assignment avoids repeated routing work. Local recognition reuses the existing provider URL parser; browser-local files preserve original bytes separately from text metadata. AI and cloud enrichment are deferred with the API work.
