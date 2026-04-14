"use client";

import React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";

import { CONSTRUCTOR_CELL_SIZE_CLASS } from "@/components/schedule/constructor-layout";
import { AppIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type ConstructorCellEntry = {
  id: number;
  subjectName: string;
  teacherName: string;
  classrooms: string[];
};

type ConstructorCellProps = {
  cellId: string;
  entry: ConstructorCellEntry | null;
  isSaving: boolean;
  teacherBusy: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export const ConstructorCell = React.memo(function ConstructorCell({
  cellId,
  entry,
  isSaving,
  teacherBusy,
  onAdd,
  onEdit,
  onDelete,
}: ConstructorCellProps) {
  const { isOver, setNodeRef } = useDroppable({ id: cellId, data: { type: "cell", cellId } });

  return (
    <td
      ref={setNodeRef}
      className={cn(
        `group ${CONSTRUCTOR_CELL_SIZE_CLASS} border border-border p-1 align-top transition-colors`,
        isOver && "bg-accent-primary-light/40",
      )}
    >
      {entry ? (
        <DraggableEntry
          cellId={cellId}
          entry={entry}
          isSaving={isSaving}
          teacherBusy={teacherBusy}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border-light text-text-tertiary/70 transition-colors hover:border-accent-primary hover:bg-bg-hover hover:text-accent-primary"
          title="Добавить запись"
        >
          <AppIcon name="add" className="h-5 w-5" />
        </button>
      )}
    </td>
  );
});

type DraggableEntryProps = {
  cellId: string;
  entry: ConstructorCellEntry;
  isSaving: boolean;
  teacherBusy: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function DraggableEntry({ cellId, entry, isSaving, teacherBusy, onEdit, onDelete }: DraggableEntryProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry:${entry.id}`,
    data: { type: "entry", entryId: entry.id, fromCellId: cellId },
  });

  const elementRef = React.useRef<HTMLDivElement | null>(null);
  const [dragSize, setDragSize] = React.useState<{ width: number; height: number } | null>(null);

  React.useEffect(() => {
    if (!isDragging) {
      setDragSize(null);
      return;
    }
    if (!elementRef.current) return;
    const rect = elementRef.current.getBoundingClientRect();
    setDragSize({ width: rect.width, height: rect.height });
  }, [isDragging]);

  const translate = !isDragging && transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined;
  const setRefs = React.useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    elementRef.current = node;
  }, [setNodeRef]);

  return (
    <div
      ref={setRefs}
      style={{
        transform: translate,
        zIndex: isDragging ? 80 : undefined,
        width: dragSize?.width,
        height: dragSize?.height,
      }}
      className={cn(
        "relative flex h-full w-full cursor-pointer flex-col rounded-md border border-border-light bg-bg-input p-2 text-left shadow-sm transition-colors",
        "hover:border-accent-primary/60 hover:shadow-md",
        isDragging && "opacity-35",
      )}
      onClick={onEdit}
    >
      <button
        type="button"
        className="absolute left-1 top-1 rounded p-0.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
        title="Перетащить запись"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        {...listeners}
        {...attributes}
      >
        <AppIcon name="menu" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        disabled={isSaving}
        className="absolute right-1 top-1 rounded p-0.5 text-text-tertiary hover:bg-bg-hover hover:text-danger"
        title="Удалить запись"
      >
        <AppIcon name="delete" className="h-3.5 w-3.5" />
      </button>

      <div className="truncate pl-6 pr-6 text-[12px] font-semibold text-text-primary">{entry.subjectName || "Предмет не указан"}</div>
      <div className="mt-1 truncate text-[11px] text-text-secondary">{entry.teacherName || "Преподаватель не указан"}</div>
      {entry.classrooms.length > 0 ? (
        <div className="mt-1 truncate text-[10px] text-text-tertiary">Каб. {entry.classrooms.join(", ")}</div>
      ) : null}
      {teacherBusy ? (
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-danger">
          <AppIcon name="warning" className="h-3 w-3" />
          Конфликт по преподавателю
        </div>
      ) : null}
    </div>
  );
}
