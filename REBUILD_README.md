# eqlStats rebuild

## Product direction

eqlStats brings every service behind a developer's project into one place: console links, notes, infrastructure, live service health, and controlled read-only sharing. The rebuild develops this foundation into a polished project workspace with a distinctive visual identity and an interactive project atlas.

## Experience principles

- Custom compositions, clear typography, strong hierarchy, and consistent spacing.
- Responsive project cards and purposeful transitions that feel natural.
- Accessible controls, keyboard navigation, reduced-motion support, and fast loading.
- A coherent design system rather than a collection of component-library demos.

## Technical direction

Retain the existing Next.js, React, TypeScript, Tailwind CSS, and Supabase foundation where appropriate. Consider Motion for transitions and gestures, shadcn/ui and Radix for accessible controls, and a consistent Lucide or Phosphor icon set. Magic UI and Aceternity UI can inform selected patterns. Use React Three Fiber and Drei selectively for the atlas; add GSAP only for a demonstrated need. These are design directions, not a requirement to install every library.

## Delivery boundaries

All rebuild work belongs on `rebuild/project-workspace-v2`. Do not modify or merge into `main` without a separate request. Preserve the existing ownership, sharing, and encrypted-integration security model. Never commit credentials or local environment files.

See `README.md` for the current implementation and setup. See `PROJECT_CONTEXT.md` for context and unresolved decisions.
