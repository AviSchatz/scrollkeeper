# Scrollkeeper

A desktop app for **tabletop RPG campaign notes**—built around a single long-form **Scroll** (rich text) and **widgets** that track people, places, plots, and prep. Data lives on your machine as JSON; no account or cloud required.

Scrollkeeper is a **[Tauri 2](https://tauri.app/)** app (Rust backend) with a **React + TypeScript** UI and **[TipTap](https://tiptap.dev/)** for editing.

Very much WIP!
---

## What you can do

- **Campaigns** — Create multiple campaigns, switch between them, and rename them from the toolbar. Everything for a campaign (scroll text, widgets, open panels, scroll position) is saved automatically.
- **The Scroll** — Write session notes, plans, and lore in one flowing document with headings, lists, and basic formatting. Type `:keyword:` (e.g. `:npc:`) to start **inline creation** or link to an existing object; confirmed entries become **accent-colored chips** that open a preview and jump to full notes in a panel.
- **Widgets & side shelves** — Each campaign gets a default set of widgets (Ideas, Monsters, NPCs, Locations, Session Plans/Notes, Factions, Loot, Traps, **Players**, **Quests**, **Conflicts**, **Loose Threads**, etc.). Icons sit on **left and right shelves**; click to open a **floating panel** with a searchable object list, jump-to-scroll, and per-object notes. Drag icons to reorder; some widgets are built-in (Table of Contents, Loose Threads) and cannot be removed.
- **Table of contents** — Open the 📑 widget to see **session plans**, **session notes**, and **session dividers** in **scroll order**, with “go to line” for each entry.
- **Session dividers** — Type `:session:` in the Scroll to insert a full-width marker labeled **Session N — date** (N is based on existing dividers). It behaves as a block you select and delete with **Delete** (not ordinary backspace from adjacent text).
- **Quests** — Inline creation includes **plot type** (A/B/C) and **status** (Active / Completed / Abandoned) pickers; the quest list shows a **status toggle** without opening the notes view.
- **Players** — First field uses a **Character — Player** style line; the **chip title** in the Scroll is the **character name** (text before the em dash).
- **Loose threads** — Right-click any line in the Scroll and choose **Flag as Loose Thread** to add an item (no chip on the line). Unresolved threads get a **left border** in the widget’s color; **Resolve** moves them to a collapsible **Resolved** section and clears the highlight.
- **Object deletion** — Trash controls in widget panels remove an object from the widget and campaign data and turn its chips into plain text.

---

## Download and run

Prebuilt installers are published on **[GitHub Releases](https://github.com/AviSchatz/scrollkeeper/releases)** for each version tag (`v*`, e.g. `v1.0.0`).

1. Open the **Releases** page and pick the version you want (or **Latest** when a stable release is published).
2. Under **Assets**, download the file for your OS:

| OS | File | What to do |
|----|------|------------|
| **Windows** | `*.exe` (NSIS setup) | Run the installer and launch **Scrollkeeper** from the Start menu or desktop shortcut. |
| **macOS** | `*.dmg` | Open the disk image, drag **Scrollkeeper** into **Applications**, then open it from there. |
| **Linux** | `*.AppImage` | `chmod +x` the file, then run it (double-click or from a terminal). |

**Draft releases:** CI may create a **draft** release first. Drafts are only visible to collaborators until you click **Publish release** on GitHub—then they appear like a normal release for everyone.

**First launch notes**

- **Windows:** SmartScreen may warn on unsigned builds; choose **More info → Run anyway** if you trust the build.
- **macOS:** If Gatekeeper blocks the app, try **right‑click → Open** on the app in Finder, or allow it in **System Settings → Privacy & Security**.
- **Linux:** AppImage needs **FUSE** on some distros to run; install your distro’s `fuse` / `libfuse2` package if the image won’t start.

Campaign data is stored on your machine in the app data folder (the in-app footer shows **Data:** with the path).

---

## Run from source (development)

For contributors or if you want a live-reload dev build, clone the repo and install **Node.js** (LTS), **npm**, **Rust**, and a **C++ build toolchain** for your OS ([Rust install](https://www.rust-lang.org/tools/install); on Windows, Visual Studio Build Tools are commonly needed for `cargo`).

From the repository root:

```bash
npm install
npm run tauri dev
```

This starts the Vite dev server (see `devUrl` in `src-tauri/tauri.conf.json`, default **http://localhost:1422**) and opens the **Scrollkeeper** desktop window.

**Web-only** (`npm run dev`) is **not** enough for full behavior: saving campaigns uses Tauri and will not work in a normal browser tab.

---

## Build a release binary (from source)

```bash
npm install
npm run tauri build
```

Installers and bundles appear under `src-tauri/target/release/bundle/` (exact layout depends on OS and Tauri config). Tagged pushes also trigger **[`.github/workflows/release.yml`](.github/workflows/release.yml)**, which builds Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage`) and uploads them to a **draft** GitHub Release.

---

## Project layout (high level)

| Area | Role |
|------|------|
| `src/App.tsx` | Campaign shell, editor, panels, save debouncing |
| `src/editor/` | TipTap Scroll, widget triggers, chips, session divider, loose-thread decorations |
| `src/widgets/` | Side shelves, floating panels, table of contents |
| `src-tauri/src/storage.rs` | Campaign JSON on disk, default widget seed |
| `src/api/storage.ts` | Frontend ↔ Tauri command bridge |

---

## License

See repository metadata (add a `LICENSE` file if you want an explicit open-source license).
