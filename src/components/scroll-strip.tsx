"use client";

import { ScrollArea } from "@base-ui/react/scroll-area";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";

// Tunables for the edge scrims and the arrow/drag scrolling.
const SCROLL_STEP = 0.75; // an arrow click scrolls this fraction of the visible width
const DRAG_THRESHOLD_PX = 5; // a mouse press moving less than this is a click, not a drag
const SCRIM_WIDTH = "4rem"; // how far the fade reaches in from each edge
const SCRIM_SOLID = "45%"; // the part of the scrim that's fully opaque, under the arrow button
const SCRIM_FADE_MS = 150; // scrims fade in and out as an edge starts or stops overflowing

// A row that scrolls sideways when it doesn't fit (the dashboard's status filters and the
// category chips). Touch scrolls it natively. With a mouse or trackpad (any-pointer-fine), each
// edge that has more content past it gets a fade and an arrow button, and the row can be dragged.
// Base UI's ScrollArea tracks which edges overflow (data-overflow-x-start/-end on the root).
export function ScrollStrip({
  ref,
  className,
  viewportClassName,
  children,
}: {
  ref?: Ref<HTMLDivElement>;
  className?: string;
  viewportClassName?: string;
  children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => viewportRef.current!, []);

  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const scrollByStep = (dir: -1 | 1) => {
    const el = viewportRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * SCROLL_STEP, behavior: reduce ? "auto" : "smooth" });
  };

  const endDrag = () => {
    const el = viewportRef.current;
    if (drag.current?.moved) {
      // The click that ends a drag would otherwise follow the chip under the pointer.
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false));
    }
    drag.current = null;
    el?.removeAttribute("data-dragging");
  };

  return (
    <ScrollArea.Root className={cn("group/strip relative", className)}>
      <ScrollArea.Viewport
        ref={viewportRef}
        className={cn(
          "relative outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
          "any-pointer-fine:group-data-has-overflow-x/strip:cursor-grab",
          "data-dragging:select-none data-dragging:*:pointer-events-none data-dragging:cursor-grabbing",
          viewportClassName,
        )}
        onPointerDown={(e) => {
          const el = e.currentTarget;
          if (e.pointerType !== "mouse" || e.button !== 0 || el.scrollWidth <= el.clientWidth) return;
          drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          if (!d.moved) {
            if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
            // Capture only once it's a drag: capturing on press would retarget a plain click.
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.setAttribute("data-dragging", "");
          }
          e.currentTarget.scrollLeft = d.left - dx;
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        // Stops the browser's own drag of a link (the category chips) from taking over.
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </ScrollArea.Viewport>
      <Scrim side="start" onClick={() => scrollByStep(-1)} />
      <Scrim side="end" onClick={() => scrollByStep(1)} />
    </ScrollArea.Root>
  );
}

function Scrim({ side, onClick }: { side: "start" | "end"; onClick: () => void }) {
  const start = side === "start";
  const Icon = start ? ChevronLeft : ChevronRight;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 hidden items-center opacity-0 transition-opacity any-pointer-fine:flex",
        start
          ? "left-0 justify-start pl-1 group-data-overflow-x-start/strip:opacity-100"
          : "right-0 justify-end pr-1 group-data-overflow-x-end/strip:opacity-100",
      )}
      style={{
        width: SCRIM_WIDTH,
        transitionDuration: `${SCRIM_FADE_MS}ms`,
        background: `linear-gradient(to ${start ? "right" : "left"}, var(--background) ${SCRIM_SOLID}, transparent)`,
      }}
    >
      {/* Out of the tab order: keyboard focus already scrolls each chip into view. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={start ? "Scroll left" : "Scroll right"}
        onClick={onClick}
        className={cn(
          "flex size-7 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          start
            ? "group-data-overflow-x-start/strip:pointer-events-auto"
            : "group-data-overflow-x-end/strip:pointer-events-auto",
        )}
      >
        <Icon className="size-4" />
      </button>
    </div>
  );
}
