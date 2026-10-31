# Project context

## Sources and certainty

This document records the repository README and the accessible portion of the referenced “Design product identity” conversation, reviewed on 2026-10-31. The accessible conversation supports a premium custom workspace, an interactive project atlas, polished motion, accessibility, and selective use of modern UI libraries. It does not establish a final logo, palette, typography, atlas specification, or detailed rebuild acceptance criteria. Confirm those decisions before implementation.

## Existing product

eqlStats is a multi-user developer project hub. Its current documented features include accounts, customizable project sections, smart console-link capture, notes, provider health checks, configurable read-only share links, and simple analytics. The current foundation uses Next.js, React, TypeScript, and Supabase.

## Rebuild vision

Develop a studio-quality project workspace with custom navigation, project cards, and interactions. Explore an interactive project atlas while keeping the primary workflows clear and responsive. Animation should support orientation and feedback, with reduced-motion alternatives. Components and effects must serve a cohesive eqlStats identity.

## Engineering constraints

- Repository: `vikaschowdary47/eqlStats`.
- Authorized branch: `rebuild/project-workspace-v2` only.
- Keep credentials, `.env.local`, tokens, and keys out of commits and output.
- Preserve row ownership, RLS, encrypted tokens, server-side secret boundaries, and share-view restrictions.
- Treat proposed libraries as options; inspect current dependencies before adding any.
- Verify responsive layout, keyboard use, reduced motion, and performance when rebuilding the UI.

## Access findings

The connected GitHub integration can read the branch but rejected a contents write with HTTP 403, “Resource not accessible by integration.” This establishes a write restriction for that integration, not its exact cause. The laptop's Git connection successfully read the remote and cloned the requested branch. A separate test file is used to verify remote writing and read-back; do not infer success merely from its local presence.

The Desktop app folder supplied by the user had no `.git` directory when inspected. Its local environment file was not opened. The Git-backed checkout for this task was created in `/Users/vikas/Documents/ChatGPT/eqlStats/repository`.
