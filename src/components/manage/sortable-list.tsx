"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

// --- Motion: tunable numbers --------------------------------------------------------------
// Rows slide out of the way while one is dragged, and the dropped row settles into its slot.
const SLIDE_MS = 200; // how long the other rows take to make room
const SLIDE_EASING = "cubic-bezier(0.25, 1, 0.5, 1)"; // fast start, soft landing
// A drag starts only after the pointer moves this far, so a click on the handle isn't a drag.
const DRAG_START_PX = 4;
// -------------------------------------------------------------------------------------------

export type SortableItem = { id: string; label: string; href?: string; meta?: string };

// A list reordered by dragging its grip handles (or focusing a handle, Space to pick up, arrow
// keys to move, Space to drop). Each drop saves the whole order; a refused save puts it back.
export function SortableList({
  items: initial,
  label,
  onReorder,
}: {
  items: SortableItem[];
  label: string;
  onReorder: (ids: string[]) => Promise<FormState>;
}) {
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_START_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const before = items;
    const next = arrayMove(
      items,
      items.findIndex((i) => i.id === active.id),
      items.findIndex((i) => i.id === over.id),
    );
    setItems(next);
    setMessage(undefined);
    startTransition(async () => {
      const result = await onReorder(next.map((i) => i.id));
      if (!result?.ok) {
        setItems(before);
        setMessage(result?.message ?? "Couldn't save the new order.");
      }
    });
  };

  return (
    <>
      {/* A stable id keeps dnd-kit's generated aria ids the same on the server and client. */}
      <DndContext id={useId()} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ul aria-label={label} aria-busy={pending} className="divide-y border-y">
            {items.map((item) => (
              <SortableRow key={item.id} item={item} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {message && (
        <p role="alert" className="pt-3 text-sm text-destructive">
          {message}
        </p>
      )}
    </>
  );
}

function SortableRow({ item }: { item: SortableItem }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    transition: { duration: SLIDE_MS, easing: SLIDE_EASING },
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-3 bg-background py-2 pr-2 text-sm",
        isDragging && "z-10 shadow-md",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Move ${item.label}`}
        className="cursor-grab touch-none rounded-sm p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      {item.href ? (
        <Link href={item.href} className="font-medium hover:underline">
          {item.label}
        </Link>
      ) : (
        <span className="font-medium">{item.label}</span>
      )}
      {item.meta && <span className="ml-auto text-muted-foreground tabular-nums">{item.meta}</span>}
    </li>
  );
}
