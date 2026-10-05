# Reply Harbor

A private desk for replies you want to make. Pick a small energy-aware batch, write in your own voice and send manually in your messaging app.

[Open the app](https://metealpkarvan.github.io/reply-harbor/) · [Download 1.0.0](https://github.com/metealpkarvan/reply-harbor/releases/latest) · [Türkçe](README.tr.md)

![Reply Harbor working interface](docs/desktop.png)

## A complete small workflow

- Manual context notes for people or aliases, channels, declared priority, effort estimate and optional follow-up day.
- A time- and energy-constrained batch of at most three conversations; future follow-ups wait.
- Three original editable starting templates: acknowledgment, reconnection and a boundary.
- Saved drafts, Turkish-aware search, parked/replied states, Markdown, JSON backups and an all-day ICS follow-up export.

All three projects from this research round have Turkish and English interfaces, fictional examples, local data, JSON recovery and zero runtime dependencies. Each project is independently usable.

## Try it

1. Click **Sample** to open four fictional conversation intentions.
2. Add a short context note and choose the effort it requires. You do not need to copy a whole private conversation.
3. Choose your present energy and time, open a draft desk and edit a starting template.
4. Copy the draft, send it yourself in your usual app, then explicitly mark it replied. Export a follow-up day to your calendar if useful.

The live app is the easiest path. For a downloaded copy, extract `reply-harbor-v1.0.0.zip` and open **index.html** in a modern browser. The release contains a prebuilt classic JavaScript bundle, so you do not need Node.js, a server or an API key to try it. Keep the ZIP and verify it against `SHA256SUMS.txt` if you want to check download integrity.

Browser storage for a `file:` page varies by browser and file location. Use JSON backups before moving the folder or switching between the live and downloaded app. If local saving is unavailable, the app warns you and keeps working in the current session.

## Data and limits

Up to 100 manually entered conversations. Effort is a personal estimate, not a clinical measure. Batch scores use priority × 100 plus 30 for a chosen day that is due; ties prefer more conversations, then fewer minutes, then input order. Templates do not infer feelings or invent an excuse. The app does not read accounts, send, schedule delivery, sync, notify in the background or diagnose users. ICS exports are all-day events with no configured alarm; reminder behavior depends on your calendar settings. Energy and time controls reset on reload.

Data remains in this browser's local storage and is unencrypted. There is no analytics, authentication, cloud sync or AI request. Clearing browser data can remove records. The app host receives ordinary page/asset requests; your saved text is not uploaded. External links are visited only on your action. A corrupt local archive blocks writes and offers the original bytes for recovery. A valid import asks before replacing data and downloads the current archive as a recovery copy first. Backup imports are bounded to 3 MB and the app's schema.

On HTTPS or localhost the interface is cached after its first online visit. This caches the app shell, not linked web pages. A downloaded copy runs from its own local files. Language changes translate controls without rewriting user content.

## Why build this?

The design comes from an exploratory snapshot of **three public X posts and eight Reddit threads**, accessed on 2026-10-05. Primary posts, partial-text limits, cached-date uncertainty, competing approaches and product hypotheses are explained in [Research](docs/RESEARCH.md) and the [full evidence ledger](docs/COMMUNITY-RESEARCH-2026-10-05.md). Posts do not establish adoption or measured effectiveness.

## Development and verification

```bash
npm test
npm run build
npm start
```

Tests/build require Node.js 22+; `npm start` uses Python 3 to serve `dist/` at localhost:8080. End users opening the release ZIP need neither runtime. There are **38 automated rule and packaging checks**. Browser acceptance also covers editing, exports, backup restore, data recovery, translations, mobile layout and offline reload; see [Verification](docs/VERIFICATION.md).

CI runs on Linux with Node 22/24 and native **Intel (x64) and Apple Silicon (arm64) Mac runners**. HTML/CSS/JavaScript runtime files use the browser on either processor and require no Rosetta. Browser acceptance on the local Intel Mac is a separate record, not proof of every browser or older macOS version.

[Architecture](docs/ARCHITECTURE.md) · [Design decisions](docs/DESIGN.md) · [Roadmap](docs/ROADMAP.md) · [Contributing](CONTRIBUTING.md)

MIT © 2026 Mete Alp Karvan
