"use client";

import { useCallback, useMemo, useState } from "react";
import type { DragCancelEvent, DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useHotkeys } from "react-hotkeys-hook";

import type { ConstructorCellEntry } from "@/components/schedule/constructor-cell";
import { createCellDndId, createCellKey, parseCellDndId, parseEntryDndId } from "@/components/schedule/constructor-dnd-utils";
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
    const subjectName = entry.subjectId ? subjectById.get(entry.subjectId)?.name || "" : "";
    const teacherNames = (entry.teacherIds.length > 0 ? entry.teacherIds : entry.teacherId ? [entry.teacherId] : [])
      .map((teacherId) => teacherById.get(teacherId))
      .filter(Boolean)
      .map((teacher) => `${teacher!.surname} ${teacher!.name[0]}.${teacher!.patronymic ? teacher!.patronymic[0] + "." : ""}`);
    return {
      id: entry.id,
      subjectName,
      teacherName: teacherNames.join(", "),
      classrooms: entry.classroomIds.map((id) => classroomById.get(id)?.number).filter(Boolean) as string[],
    } satisfies ConstructorCellEntry;
  }, [activeDragEntryId, scheduleById, subjectById, teacherById, classroomById]);

  const resolveOverCellId = useCallback(
    (id: string | number | null | undefined): string | null => {
      if (!id) return null;
      const text = String(id);
      if (text.startsWith("cell:")) return text;
      const entryId = parseEntryDndId(text);
      if (!entryId) return null;
      const entry = scheduleById.get(entryId);
      if (!entry) return null;
      return createCellDndId(entry.classId, entry.day, entry.lessonNumber);
    },
    [scheduleById],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const entryId = parseEntryDndId(String(event.active.id));
    setActiveDragEntryId(entryId);
    const initial = event.active.rect.current.initial;
    if (initial?.width && initial?.height) {
      setDragOverlaySize({ width: initial.width, height: initial.height });
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

      const targetCellDndId = resolveOverCellId(event.over?.id);
      if (!targetCellDndId) return;

      const targetCell = parseCellDndId(targetCellDndId);
      if (!targetCell) return;

      const isSameCell =
        sourceEntry.classId === targetCell.classId &&
        sourceEntry.day === targetCell.day &&
        sourceEntry.lessonNumber === targetCell.lessonNumber;
      if (isSameCell) return;

      const duplicateModeFromEvent =
        event.activatorEvent && "shiftKey" in event.activatorEvent && event.activatorEvent.shiftKey;
      const shouldDuplicate = isShiftPressed || duplicateModeFromEvent;

      const targetExisting = scheduleByCell.get(createCellKey(targetCell.classId, targetCell.day, targetCell.lessonNumber));

      try {
        const destinationPayload: SchedulePayload = {
          listId: selectedListId,
          classId: targetCell.classId,
          day: targetCell.day,
          lessonNumber: targetCell.lessonNumber,
          subjectId: sourceEntry.subjectId,
          teacherId: sourceEntry.teacherId,
          teacherIds: sourceEntry.teacherIds,
          classroomIds: sourceEntry.classroomIds,
        };

        const response = await upsertCell(destinationPayload);
        const destinationScheduleId = Number(response.scheduleId);

        if (!shouldDuplicate) {
          await deleteCell(sourceEntry.id);
        }

        setSchedule((previous) => {
          let next = previous.filter((item) => {
            if (!shouldDuplicate && item.id === sourceEntry.id) return false;
            if (targetExisting && item.id === targetExisting.id) return false;
            if (item.id === destinationScheduleId) return false;
            return true;
          });
          next = next.filter(
            (item) =>
              !(item.classId === targetCell.classId && item.day === targetCell.day && item.lessonNumber === targetCell.lessonNumber),
          );
          next.push({ ...destinationPayload, id: destinationScheduleId, teacherId: destinationPayload.teacherId ?? null });
          return next;
        });
      } catch (error: any) {
        alert(error.message || "Не удалось переместить запись");
      }
    },
    [deleteCell, isShiftPressed, resolveOverCellId, scheduleByCell, scheduleById, selectedListId, setSchedule, upsertCell],
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
