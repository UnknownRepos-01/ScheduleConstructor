"use client";

import React from "react";
import {
  closestCenter,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
} from "@dnd-kit/core";

import { ConstructorCell } from "@/components/schedule/constructor-cell";
import type { ConstructorCellEntry } from "@/components/schedule/constructor-cell";
import { getEntryTeacherIds } from "@/components/schedule/constructor-entry-utils";
import { createCellDndId, createCellKey, DAYS, LESSONS } from "@/components/schedule/constructor-dnd-utils";
import { ConstructorDragOverlay } from "@/components/schedule/constructor-drag-overlay";
import { CONSTRUCTOR_HEADER_CELL_SIZE_CLASS } from "@/components/schedule/constructor-layout";
import type { CellCoordinates, ClassItem, ScheduleEntry } from "@/components/schedule/constructor-types";

type ConstructorGridProps = {
  classes: ClassItem[];
  saving: boolean;
  scheduleByCell: Map<string, ScheduleEntry>;
  subjectNameById: Map<number, string>;
  teacherShortNameById: Map<number, string>;
  classroomNumberById: Map<number, string>;
  getTeacherBusyCount: (teacherId: number, cell: CellCoordinates, excludeEntryId?: number) => number;
  onAddLesson: (cell: CellCoordinates) => void;
  onEditLesson: (cell: CellCoordinates, entry: ScheduleEntry) => void;
  onDeleteLesson: (entry: ScheduleEntry) => void;
  activeDragEntry: ConstructorCellEntry | null;
  dragOverlaySize: { width: number; height: number } | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: (event: DragCancelEvent) => void;
};

export const ConstructorGrid = React.memo(function ConstructorGrid({
  classes,
  saving,
  scheduleByCell,
  subjectNameById,
  teacherShortNameById,
  classroomNumberById,
  getTeacherBusyCount,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  activeDragEntry,
  dragOverlaySize,
  onDragStart,
  onDragEnd,
  onDragCancel,
}: ConstructorGridProps) {
  return (
    <DndContext
      collisionDetection={(args) => {
        const pointerCollisions = pointerWithin(args);
        return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="h-[calc(100dvh-168px)] max-w-[100vw] overflow-auto rounded-lg border border-border bg-bg-card">
        <table className="w-full table-fixed border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="sticky top-0 z-20 w-[70px] border border-border bg-bg-tertiary px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">
                День
              </th>
              <th className="sticky top-0 z-20 w-10 border border-border bg-bg-tertiary px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">
                Урок
              </th>
              {classes.map((classItem) => (
                <th
                  key={classItem.id}
                  className={`sticky top-0 z-20 ${CONSTRUCTOR_HEADER_CELL_SIZE_CLASS} border border-border bg-bg-tertiary px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary`}
                >
                  {classItem.displayName}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {DAYS.map((day) => (
              <React.Fragment key={day.id}>
                {LESSONS.map((lessonNumber, lessonIndex) => (
                  <tr key={`${day.id}-${lessonNumber}`}>
                    {lessonIndex === 0 ? (
                      <td
                        rowSpan={LESSONS.length}
                        className="sticky left-[-1px] z-10 min-w-[44px] max-w-[60px] border border-border bg-accent-primary-light px-2 py-2 text-center text-[13px] font-bold text-accent-primary [writing-mode:vertical-rl]"
                      >
                        {day.name}
                      </td>
                    ) : null}

                    <td className="sticky left-[43px] z-10 w-10 border border-border bg-bg-tertiary px-2 py-2 text-center font-semibold text-text-secondary">
                      {lessonNumber}
                    </td>

                    {classes.map((classItem) => {
                      const cell = { classId: classItem.id, day: day.id, lessonNumber };
                      const cellKey = createCellKey(cell.classId, cell.day, cell.lessonNumber);
                      const cellDndId = createCellDndId(cell.classId, cell.day, cell.lessonNumber);

                      const entry = scheduleByCell.get(cellKey) || null;
                      const entryTeacherIds = entry ? getEntryTeacherIds(entry) : [];

                      const teacherBusy =
                        !!entry &&
                        entryTeacherIds.some(
                          (teacherId) => getTeacherBusyCount(teacherId, cell, entry.id) > 0,
                        );

                      const subjectName = entry?.subjectId ? subjectNameById.get(entry.subjectId) || "" : "";
                      const teacherName = entryTeacherIds
                        .map((teacherId) => teacherShortNameById.get(teacherId))
                        .filter(Boolean)
                        .join(", ");
                      const classrooms = entry
                        ? entry.classroomIds
                            .map((classroomId) => classroomNumberById.get(classroomId))
                            .filter(Boolean)
                        : [];

                      return (
                        <ConstructorCell
                          key={cellDndId}
                          cellId={cellDndId}
                          isSaving={saving}
                          teacherBusy={teacherBusy}
                          entry={
                            entry
                              ? {
                                  id: entry.id,
                                  subjectName,
                                  teacherName,
                                  classrooms: classrooms as string[],
                                }
                              : null
                          }
                          onAdd={() => onAddLesson(cell)}
                          onEdit={() => {
                            if (!entry) return;
                            onEditLesson(cell, entry);
                          }}
                          onDelete={() => {
                            if (!entry) return;
                            onDeleteLesson(entry);
                          }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <DragOverlay transition={"none"}>
        <ConstructorDragOverlay entry={activeDragEntry} size={dragOverlaySize} />
      </DragOverlay>
    </DndContext>
  );
});
