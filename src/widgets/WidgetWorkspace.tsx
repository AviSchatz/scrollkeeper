import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Widget } from "../types/campaign";
import { LEFT_SHELF_ID, RIGHT_SHELF_ID, applyWidgetDrag, sortWidgetsByShelf } from "./widgetLayout";
import "./widgetWorkspace.css";

type WidgetWorkspaceProps = {
  widgets: Widget[];
  openPanelIds: string[];
  onWidgetsChange: (widgets: Widget[]) => void;
  onWidgetIconClick: (widgetId: string) => void;
  onTocOpen: () => void;
  onRenameWidget: (widgetId: string, name: string) => void;
  onEmojiWidget: (widgetId: string, emoji: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  registerWidgetAnchor: (widgetId: string, el: HTMLElement | null) => void;
  children: ReactNode;
};

type CtxState = { widgetId: string; x: number; y: number } | null;

function WidgetContextMenu({
  ctx,
  widget,
  onClose,
  onRename,
  onEmoji,
  onDelete,
}: {
  ctx: NonNullable<CtxState>;
  widget: Widget;
  onClose: () => void;
  onRename: () => void;
  onEmoji: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPtr(e: PointerEvent) {
      const el = ref.current;
      const t = e.target;
      if (el && t instanceof globalThis.Node && !el.contains(t)) onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPtr, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPtr, true);
    };
  }, [onClose]);

  const toc = widget.builtIn === "toc";

  return (
    <div
      ref={ref}
      className="widget-ctx-menu"
      style={{ left: ctx.x, top: ctx.y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button type="button" className="widget-ctx-menu__item" role="menuitem" onClick={onRename}>
        Rename…
      </button>
      <button type="button" className="widget-ctx-menu__item" role="menuitem" onClick={onEmoji}>
        Change emoji…
      </button>
      {!toc && (
        <button type="button" className="widget-ctx-menu__item widget-ctx-menu__item--danger" role="menuitem" onClick={onDelete}>
          Delete widget…
        </button>
      )}
    </div>
  );
}

function SortableWidgetTile({
  widget,
  openPanelIds,
  onIconClick,
  registerAnchor,
  onContextMenuOpen,
}: {
  widget: Widget;
  openPanelIds: string[];
  onIconClick: (id: string) => void;
  registerAnchor: (id: string, el: HTMLElement | null) => void;
  onContextMenuOpen: (widgetId: string, clientX: number, clientY: number) => void;
}) {
  const toc = widget.builtIn === "toc";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 2 : undefined,
  };

  const open = openPanelIds.includes(widget.id);

  return (
    <div ref={setNodeRef} style={style} className="widget-float">
      <button
        type="button"
        className={
          open
            ? "widget-float__icon widget-float__icon--open"
            : "widget-float__icon"
        }
        style={{ ["--tile-accent" as string]: widget.colorAccent }}
        ref={(el) => registerAnchor(widget.id, el)}
        onClick={() => onIconClick(widget.id)}
        title={widget.name}
        aria-label={toc ? `Open table of contents (${widget.name})` : `Open ${widget.name} panel`}
        aria-pressed={open}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenuOpen(widget.id, e.clientX, e.clientY);
        }}
      >
        <span className="widget-float__emoji" aria-hidden>
          {widget.emoji}
        </span>
      </button>
      <span className="widget-float__label" title={widget.name}>
        {widget.name}
      </span>
      <button
        type="button"
        className="widget-float__handle"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${widget.name}`}
      >
        ⋮
      </button>
    </div>
  );
}

function ShelfColumn({
  side,
  widgets,
  openPanelIds,
  onIconClick,
  registerAnchor,
  onContextMenuOpen,
}: {
  side: "left" | "right";
  widgets: Widget[];
  openPanelIds: string[];
  onIconClick: (id: string) => void;
  registerAnchor: (id: string, el: HTMLElement | null) => void;
  onContextMenuOpen: (widgetId: string, clientX: number, clientY: number) => void;
}) {
  const shelfId = side === "left" ? LEFT_SHELF_ID : RIGHT_SHELF_ID;
  const { setNodeRef } = useDroppable({ id: shelfId });
  const ids = widgets.map((w) => w.id);

  return (
    <div
      ref={setNodeRef}
      className={`widget-rail widget-rail--${side}`}
      aria-label={side === "left" ? "Left widgets" : "Right widgets"}
    >
      <SortableContext id={side === "left" ? "left" : "right"} items={ids} strategy={verticalListSortingStrategy}>
        <div className="widget-rail__list">
          {widgets.map((w) => (
            <SortableWidgetTile
              key={w.id}
              widget={w}
              openPanelIds={openPanelIds}
              onIconClick={onIconClick}
              registerAnchor={registerAnchor}
              onContextMenuOpen={onContextMenuOpen}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function WidgetWorkspace({
  widgets,
  openPanelIds,
  onWidgetsChange,
  onWidgetIconClick,
  onTocOpen,
  onRenameWidget,
  onEmojiWidget,
  onDeleteWidget,
  registerWidgetAnchor,
  children,
}: WidgetWorkspaceProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const [ctx, setCtx] = useState<CtxState>(null);

  const handleContextMenuOpen = useCallback((widgetId: string, clientX: number, clientY: number) => {
    setCtx({ widgetId, x: clientX, y: clientY });
  }, []);

  const { left, right } = sortWidgetsByShelf(widgets);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const next = applyWidgetDrag(widgets, activeId, overId);
    onWidgetsChange(next);
  }

  const ctxWidget = ctx ? widgets.find((w) => w.id === ctx.widgetId) : undefined;

  const handleIconClick = useCallback(
    (id: string) => {
      const w = widgets.find((x) => x.id === id);
      if (w?.builtIn === "toc") {
        onTocOpen();
        return;
      }
      onWidgetIconClick(id);
    },
    [widgets, onTocOpen, onWidgetIconClick],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="workspace workspace--dnd">
        <div className="scroll-stage">
          <ShelfColumn
            side="left"
            widgets={left}
            openPanelIds={openPanelIds}
            onIconClick={handleIconClick}
            registerAnchor={registerWidgetAnchor}
            onContextMenuOpen={handleContextMenuOpen}
          />
          <div className="scroll-stage__center">{children}</div>
          <ShelfColumn
            side="right"
            widgets={right}
            openPanelIds={openPanelIds}
            onIconClick={handleIconClick}
            registerAnchor={registerWidgetAnchor}
            onContextMenuOpen={handleContextMenuOpen}
          />
        </div>
      </div>
      {ctx && ctxWidget && (
        <WidgetContextMenu
          ctx={ctx}
          widget={ctxWidget}
          onClose={() => setCtx(null)}
          onRename={() => {
            setCtx(null);
            const name = window.prompt("Widget name", ctxWidget.name);
            if (name !== null && name.trim()) onRenameWidget(ctxWidget.id, name.trim());
          }}
          onEmoji={() => {
            setCtx(null);
            const e = window.prompt("Emoji (one character or paste)", ctxWidget.emoji);
            if (e !== null && e.trim()) onEmojiWidget(ctxWidget.id, e.trim().slice(0, 4));
          }}
          onDelete={() => {
            setCtx(null);
            if (ctxWidget.builtIn === "toc" || ctxWidget.builtIn === "looseThreads") return;
            if (window.confirm(`Delete widget “${ctxWidget.name}”? Objects stay in campaign data until removed from the panel.`)) {
              onDeleteWidget(ctxWidget.id);
            }
          }}
        />
      )}
    </DndContext>
  );
}
