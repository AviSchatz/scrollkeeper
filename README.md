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

## Requirements

- **Node.js** (LTS recommended) and **npm**
- **Rust** and a C++ build toolchain for your OS ([install Rust](https://www.rust-lang.org/tools/install); on Windows, Visual Studio Build Tools are commonly needed for `cargo`)

---

## Run locally (development)

From the repository root:

```bash
npm install
npm run tauri dev
```

This starts the Vite dev server (see `devUrl` in `src-tauri/tauri.conf.json`, default **http://localhost:1422**) and opens the **Scrollkeeper** desktop window. Campaign files are written under the app data directory (exposed in-app in the footer as **Data:** …).

**Web-only dev** (`npm run dev`) is **not** enough for full behavior: persistence uses Tauri `invoke` commands and will not work in a normal browser tab.

---

## Build a release binary

```bash
npm install
npm run tauri build
```

Installers and bundles appear under `src-tauri/target/release/bundle/` (exact layout depends on OS and Tauri config).

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
