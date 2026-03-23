import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { TocEntry } from "./tableOfContents";
import "./tableOfContentsPanel.css";

type TableOfContentsPanelProps = {
  open: boolean;
  onClose: () => void;
  entries: TocEntry[];
  onJumpTo: (pos: number) => void;
};

function EntryRow({ entry, onJump }: { entry: TocEntry; onJump: (pos: number) => void }) {
  const canJump = entry.scrollAnchorPos !== undefined;
  return (
    <li className="toc-entry">
      <div className="toc-entry__main">
        <span className="toc-entry__kind muted">{entry.widgetLabel}</span>
        <span className="toc-entry__text">{entry.tagText}</span>
      </div>
      <button
        type="button"
        className="toc-entry__jump"
        disabled={!canJump}
        onClick={() => canJump && onJump(entry.scrollAnchorPos!)}
      >
        Go to line
      </button>
    </li>
  );
}

export function TableOfContentsPanel({ open, onClose, entries, onJumpTo }: TableOfContentsPanelProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const total = entries.length;

  return createPortal(
    <div className="toc-overlay" role="presentation">
      <button type="button" className="toc-backdrop" aria-label="Close table of contents" onClick={onClose} />
      <aside id="toc-panel" className="toc-panel" role="dialog" aria-modal="true" aria-labelledby="toc-title">
        <header className="toc-panel__head">
          <h2 id="toc-title" className="toc-panel__title">
            Table of contents
          </h2>
          <button type="button" className="toc-panel__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="toc-panel__body">
          {total === 0 ? (
            <p className="toc-empty muted">
              No session entries yet. Type <kbd>:sessionplan:</kbd>, <kbd>:sessionnotes:</kbd>, or{" "}
              <kbd>:session:</kbd> in the Scroll — entries appear here in document order.
            </p>
          ) : (
            <section className="toc-section" aria-label="Scroll order">
              <h3 className="toc-section__label">Chronological (scroll order)</h3>
              <ul className="toc-list">
                {entries.map((e) => (
                  <EntryRow key={`${e.widgetId}-${e.id}`} entry={e} onJump={onJumpTo} />
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
