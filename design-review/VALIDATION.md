# Frontend verification, 2026-10-31

Branch: rebuild/project-workspace-v2. Production build served locally on port 4400. Browser tests used the connected in-app browser, not mocked component output.

## Passed
- `npm run typecheck`.
- `npm run build` (Next.js production build and generated routes).
- `git diff --check`.
- Dependency installation audit: zero reported vulnerabilities.
- Home: attention filter, search with zero-result state, recovery to all projects, alphabetical sorting, gallery/atlas toggling.
- Quick look: correct service details, Escape closes modal.
- Editor: Shift+Tab wraps from close to submit; Tab wraps back to close; focus remains inside modal; Escape dismisses.
- Create local project and open its workspace.
- Create/edit note, pin it, reload, confirm edited content persists.
- Create artifact with a reference URL.
- Create decision with reasoning.
- Add manual service/account reference without credentials; directory marks it saved locally.
- Simulate GitHub repository import; imported sample becomes a local project and repeat import is disabled.
- Save MCP connection preference; connection remains explicitly disconnected.
- Save workspace identity setting.
- Desktop 1440px: three cover columns, no document horizontal overflow.
- Phone 390px: one column, scrollable labeled navigation, atlas and connection screens without document horizontal overflow.
- No captured browser console warnings/errors on the frontend workflow pass.

## Boundaries
- Only local browser storage was written during interaction tests. The review browser contains the test project `Studio QA`, sample import `paperplane`, and QA note/artifact/decision/service records.
- Supabase schema, migrations, RLS, secrets and live records were not modified. No database/API connections were added.
- Authenticated creation, live integration checks and existing share flows were not exercised because this checkout has no Supabase runtime environment configured. Existing Google font fetches required network-enabled build execution.
- Reduced motion is implemented with MotionConfig and CSS media queries; an OS-level reduced-motion session was not exercised.
- This is manual functional/responsive/keyboard verification, not a full axe audit or measured LCP/CLS/FPS benchmark.
- Screenshots contain illustrative sample data and local test records.

Final finishing pass: mobile Explore studio menu exposes all eight destinations and closes after selection; no phone overflow observed. Singular service/item counts corrected. Final production build and typecheck passed after these changes. Independent screenshot review: design 8.4, usability 7.8, creativity 8.0, content 8.1 before the final menu/count fixes; no blocking visual defects identified. No post-fix numerical score is claimed.

## Drop anything capture pass
- Added 12 passing parser regression tests: mixed console/reference/note input, project matching, markdown URL punctuation, duplicate collapse, decisions, unknown references, protocol-less domains, malformed escapes, file URLs, empty input, unsafe schemes, email/filename false positives, and ambiguous projects.
- Production build and TypeScript passed.
- Browser: mixed GitHub/Vercel/decision input produced correct editable review; missing project blocked saving; assigning it enabled a successful three-item save.
- Repeating an existing project URL returned zero new items and one duplicate.
- Bulk project selection applied to every review item.
- Project-local capture defaulted to the open project; Escape preserved the unsaved draft.
- Navigation shortcut focused the textbox. Desktop and mobile review had no document horizontal overflow. No captured console warnings/errors.
- File attachment browser test was blocked because the browser upload permission was declined. It was not retried or bypassed. Actual file upload, IndexedDB persistence and download were therefore not verified in the browser. File support is implemented; this verification limitation remains explicit.
- Local parser only: no AI extraction of arbitrary documents, remote page metadata, API calls, schema changes or live data writes.
