# Architecture

The runtime has no third-party packages. `src/core.js` holds pure domain rules, `src/ui.js` holds escaped rendering helpers, local storage and recovery, and `src/app.js` binds native browser controls to those rules. The scripts and styles ship with each repository; one app does not import another repository at runtime.

## Model

`{items: [{id, name, topic, channel, energy, priority, minutes, added, when, status, draft}]}`

The validator reconstructs an allowlisted record shape, bounds text sizes, rejects unsupported states and duplicate IDs, and validates calendar dates. Import validates before any mutation. A damaged stored record is retained verbatim and prevents writes. Storage quota/permission failures retain the session state and show a visible backup warning. Local storage is not encryption and is not cross-device sync.

## Standalone distribution

`scripts/build.mjs` wraps the named core/UI exports into private namespaces and joins the app into one classic script. It supports this codebase's function/const exports including async functions and dollar-sign identifiers; it is not a general-purpose JavaScript bundler. Packaging tests compare the built namespaces with the actual ES module export keys. The built HTML loads only local assets and does not fetch ES modules, so the release opens directly from disk.

The HTTPS/localhost service worker precaches only the built app shell under a project-specific cache name. It intercepts only GET requests within its own origin/path and leaves external links alone. CSP disallows inline scripts, object embeds, arbitrary form submission and remote runtime dependencies. User text is escaped before entering HTML; file paths and source diff lines are displayed as text. Clipboard use has a downloadable text fallback.

## Delivery and verification boundaries

Up to 100 manually entered conversations. Effort is a personal estimate, not a clinical measure. Batch scores use priority × 100 plus 30 for a chosen day that is due; ties prefer more conversations, then fewer minutes, then input order. Templates do not infer feelings or invent an excuse. The app does not read accounts, send, schedule delivery, sync, notify in the background or diagnose users. ICS exports are all-day events with no configured alarm; reminder behavior depends on your calendar settings. Energy and time controls reset on reload.

The browser controls execute locally; no model provider interprets records. GitHub Actions runs rule/packaging checks and deploys tested static files to Pages. This does not test every physical Mac or browser. The verification record distinguishes automated rules, browser acceptance and social effectiveness.
