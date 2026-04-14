"use client";

import { useCallback, useMemo, useState } from "react";
import type { DragCancelEvent, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useHotkeys } from "react-hotkeys-hook";
import type { ConstructorCellEntry } from "@/components/schedule/constructor-cell";
import { formatTeacherShortName, getEntryTeacherIds } from "@/components/schedule/constructor-entry-utils";
import { createCellDndId, createCellKey, parseCellDndId, parseEntryDndId } from "@/components/schedule/constructor-dnd-utils";
import { CONSTRUCTOR_TEXT } from "@/components/schedule/constructor-text";
import type { Classroom, ScheduleEntry, SchedulePayload, Subject, Teacher } from "@/components/schedule/constructor-types";

type UseConstructorDndParams = {
  selectedListId: number | null;
  scheduleById: Map<number, ScheduleEntry>;
  scheduleByCell: Map<string, ScheduleEntry>;
  subjectById: Map<number, Subject>;
  teacherById: Map<number, Teacher>;
  classroomById: Map<number, Classroom>;
  upsertCell: (payload: SchedulePayload) => Promise<{ scheduleId: number }>;
  deleteCell: (scheduleId: number) => Promise<unknown>;
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleEntry[]>>;
};

export function useConstructorDnd({
  selectedListId,
  scheduleById,
  scheduleByCell,
  subjectById,
  teacherById,
  classroomById,
  upsertCell,
  deleteCell,
  setSchedule,
}: UseConstructorDndParams) {
  const [activeDragEntryId, setActiveDragEntryId] = useState<number | null>(null);
  const [dragOverlaySize, setDragOverlaySize] = useState<{ width: number; height: number } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  useHotkeys("shift", () => setIsShiftPressed(true), { keydown: true, keyup: false }, []);
  useHotkeys("shift", () => setIsShiftPressed(false), { keydown: false, keyup: true }, []);

  const activeDragEntry = useMemo(() => {
    if (!activeDragEntryId) return null;
    const entry = scheduleById.get(activeDragEntryId);
    if (!entry) return null;

    const teacherName = getEntryTeacherIds(entry)
      .map((teacherId) => teacherById.get(teacherId))
      .filter(Boolean)
      .map((teacher) => formatTeacherShortName(teacher!))
      .join(", ");

    return {
      id: entry.id,
      subjectName: entry.subjectId ? subjectById.get(entry.subjectId)?.name || "" : "",
      teacherName,
      classrooms: entry.classroomIds
        .map((classroomId) => classroomById.get(classroomId)?.number)
        .filter(Boolean) as string[],
    } satisfies ConstructorCellEntry;
  }, [activeDragEntryId, classroomById, scheduleById, subjectById, teacherById]);

  const resolveOverCellDndId = useCallback(
    (value: string | number | null | undefined): string | null => {
      if (!value) return null;
      const overId = String(value);
      if (overId.startsWith("cell:")) return overId;

      const overEntryId = parseEntryDndId(overId);
      if (!overEntryId) return null;

      const overEntry = scheduleById.get(overEntryId);
      if (!overEntry) return null;

      return createCellDndId(overEntry.classId, overEntry.day, overEntry.lessonNumber);
    },
    [scheduleById],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragEntryId(parseEntryDndId(String(event.active.id)));

    const initialRect = event.active.rect.current.initial;
    if (initialRect?.width && initialRect?.height) {
      setDragOverlaySize({ width: initialRect.width, height: initialRect.height });
      return;
    }

    setDragOverlaySize(null);
  }, []);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveDragEntryId(null);
    setDragOverlaySize(null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const sourceEntryId = parseEntryDndId(String(event.active.id));
      setActiveDragEntryId(null);
      setDragOverlaySize(null);

      if (!sourceEntryId || !selectedListId) return;

      const sourceEntry = scheduleById.get(sourceEntryId);
      if (!sourceEntry) return;

      const overCellDndId = resolveOverCellDndId(event.over?.id);
      if (!overCellDndId) return;

      const targetCell = parseCellDndId(overCellDndId);
      if (!targetCell) return;

      const isSameCell =
        sourceEntry.classId === targetCell.classId &&
        sourceEntry.day === targetCell.day &&
        sourceEntry.lessonNumber === targetCell.lessonNumber;
      if (isSameCell) return;

      const duplicateWithShift =
        event.activatorEvent && "shiftKey" in event.activatorEvent && event.activatorEvent.shiftKey;
      const shouldDuplicate = isShiftPressed || duplicateWithShift;

      const existingTargetEntry = scheduleByCell.get(
        createCellKey(targetCell.classId, targetCell.day, targetCell.lessonNumber),
      );

      try {
        const sourceTeacherIds = getEntryTeacherIds(sourceEntry);
        const destinationPayload: SchedulePayload = {
          listId: selectedListId,
          classId: targetCell.classId,
          day: targetCell.day,
          lessonNumber: targetCell.lessonNumber,
          subjectId: sourceEntry.subjectId,
          teacherId: sourceTeacherIds[0] ?? sourceEntry.teacherId,
          teacherIds: sourceTeacherIds,
          classroomIds: sourceEntry.classroomIds,
        };

        const response = await upsertCell(destinationPayload);
        const destinationScheduleId = Number(response.scheduleId);

        if (!shouldDuplicate) {
          await deleteCell(sourceEntry.id);
        }

        setSchedule((previous) => {
          const next = previous.filter((item) => {
            if (!shouldDuplicate && item.id === sourceEntry.id) return false;
            if (existingTargetEntry && item.id === existingTargetEntry.id) return false;
            if (item.id === destinationScheduleId) return false;
            return !(
              item.classId === targetCell.classId &&
              item.day === targetCell.day &&
              item.lessonNumber === targetCell.lessonNumber
            );
          });

          return [...next, { ...destinationPayload, id: destinationScheduleId, teacherId: destinationPayload.teacherId ?? null }];
        });
      } catch (error: any) {
        alert(error.message || CONSTRUCTOR_TEXT.scheduleMoveError);
      }
    },
    [deleteCell, isShiftPressed, resolveOverCellDndId, scheduleByCell, scheduleById, selectedListId, setSchedule, upsertCell],
  );

  return {
    isShiftPressed,
    activeDragEntry,
    dragOverlaySize,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
  };
}
