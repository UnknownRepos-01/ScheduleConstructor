"use client";

import type { ConstructorCellEntry } from "@/components/schedule/constructor-cell";

type ConstructorDragOverlayProps = {
  entry: ConstructorCellEntry | null;
  size: { width: number; height: number } | null;
};

export function ConstructorDragOverlay({ entry, size }: ConstructorDragOverlayProps) {
  if (!entry) return null;

  return (
    <div
      className="min-h-[84px] rounded-md border border-accent-primary/40 bg-bg-card p-2 shadow-2xl"
      style={{
        width: size?.width,
        height: size?.height,
      }}
    >
      <div className="text-[12px] font-semibold text-text-primary">{entry.subjectName || "Предмет не указан"}</div>
      <div className="mt-1 text-[11px] text-text-secondary">{entry.teacherName || "Преподаватель не указан"}</div>
      {entry.classrooms.length > 0 ? (
        <div className="mt-1 text-[10px] text-text-tertiary">Каб. {entry.classrooms.join(", ")}</div>
      ) : null}
    </div>
  );
}
