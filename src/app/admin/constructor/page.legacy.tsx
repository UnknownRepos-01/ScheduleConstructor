"use client";

/*export { default } from "@/app/admin/constructor/page";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
} from "@dnd-kit/core";
import { useHotkeys } from "react-hotkeys-hook";

import { ConstructorCell, type ConstructorCellEntry } from "@/components/schedule/constructor-cell";
import { ConstructorDragOverlay } from "@/components/schedule/constructor-drag-overlay";
import { CONSTRUCTOR_HEADER_CELL_SIZE_CLASS } from "@/components/schedule/constructor-layout";
import { ConstructorLessonModal } from "@/components/schedule/constructor-lesson-modal";
import { ConstructorListModal } from "@/components/schedule/constructor-list-modal";
import { ConstructorToolbar } from "@/components/schedule/constructor-toolbar";
import type {
  AddLessonForm,
  CellCoordinates,
  ClassItem,
  Classroom,
  ListItem,
  ScheduleEntry,
  SchedulePayload,
  Subject,
  Teacher,
} from "@/components/schedule/constructor-types";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  useActivateListMutation,
  useClassesQuery,
  useClassroomsQuery,
  useCreateListMutation,
  useDeleteListMutation,
  useDuplicateListMutation,
  useDeleteScheduleCellMutation,
  useListsQuery,
  useScheduleAutocompleteQuery,
  useScheduleByListQuery,
  useSubjectsQuery,
  useTeachersQuery,
  useUpdateListMutation,
  useUpsertScheduleCellMutation,
} from "@/lib/react-query";

const DAYS = [
  { id: 1, name: "Понедельник" },
  { id: 2, name: "Вторник" },
  { id: 3, name: "Среда" },
  { id: 4, name: "Четверг" },
  { id: 5, name: "Пятница" },
];

const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8];

type TeacherLoadMap = Map<string, number>;
type ClassroomLoadMap = Map<string, number>;

const createCellKey = (classId: number, day: number, lessonNumber: number) => `${classId}:${day}:${lessonNumber}`;
const createCellDndId = (classId: number, day: number, lessonNumber: number) => `cell:${createCellKey(classId, day, lessonNumber)}`;

function parseCellDndId(id: string): CellCoordinates | null {
  if (!id.startsWith("cell:")) return null;
  const [, classIdRaw, dayRaw, lessonRaw] = id.split(":");
  const classId = Number(classIdRaw);
  const day = Number(dayRaw);
  const lessonNumber = Number(lessonRaw);
  if (!classId || !day || !lessonNumber) return null;
  return { classId, day, lessonNumber };
}
function parseEntryDndId(id: string): number | null {
  if (!id.startsWith("entry:")) return null;
  const parsed = Number(id.slice("entry:".length));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ConstructorPage() {
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);

  const [listModalMode, setListModalMode] = useState<"create" | "rename" | "duplicate" | null>(null);
  const [listModalName, setListModalName] = useState("");
  const [listModalError, setListModalError] = useState<string | null>(null);

  const [activeCell, setActiveCell] = useState<CellCoordinates | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [addLessonForm, setAddLessonForm] = useState<AddLessonForm>({
    subjectId: "",
    teacherId: "",
    classroomIds: [],
  });
  const [addLessonError, setAddLessonError] = useState<string | null>(null);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);
  const [isSubjectManuallyChanged, setIsSubjectManuallyChanged] = useState(false);
  const [isTeacherManuallyChanged, setIsTeacherManuallyChanged] = useState(false);
  const [areClassroomsManuallyChanged, setAreClassroomsManuallyChanged] = useState(false);

  const [activeDragEntryId, setActiveDragEntryId] = useState<number | null>(null);
  const [dragOverlaySize, setDragOverlaySize] = useState<{ width: number; height: number } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const listsQuery = useListsQuery();
  const classesQuery = useClassesQuery();
  const teachersQuery = useTeachersQuery();
  const subjectsQuery = useSubjectsQuery();
  const classroomsQuery = useClassroomsQuery();
  const scheduleQuery = useScheduleByListQuery(selectedListId);
  const selectedSubjectIdForAutocomplete = addLessonForm.subjectId ? Number(addLessonForm.subjectId) : null;
  const selectedTeacherIdForAutocomplete = addLessonForm.teacherId ? Number(addLessonForm.teacherId) : null;
  const autocompleteQuery = useScheduleAutocompleteQuery(
    activeCell
      ? {
          classId: activeCell.classId,
          subjectId: selectedSubjectIdForAutocomplete,
          teacherId: selectedTeacherIdForAutocomplete,
        }
      : null,
    !!activeCell,
  );
  const createListMutation = useCreateListMutation();
  const activateListMutation = useActivateListMutation();
  const updateListMutation = useUpdateListMutation();
  const duplicateListMutation = useDuplicateListMutation();
  const deleteListMutation = useDeleteListMutation();
  const upsertScheduleMutation = useUpsertScheduleCellMutation(selectedListId);
  const deleteScheduleMutation = useDeleteScheduleCellMutation(selectedListId);

  const lists = (listsQuery.data ?? []) as ListItem[];
  const classes = (classesQuery.data ?? []) as ClassItem[];
  const teachers = (teachersQuery.data ?? []) as Teacher[];
  const subjects = (subjectsQuery.data ?? []) as Subject[];
  const classrooms = (classroomsQuery.data ?? []) as Classroom[];

  const loading =
    listsQuery.isLoading ||
    classesQuery.isLoading ||
    teachersQuery.isLoading ||
    subjectsQuery.isLoading ||
    classroomsQuery.isLoading ||
    (selectedListId !== null && scheduleQuery.isLoading);

  const saving =
    upsertScheduleMutation.isPending ||
    deleteScheduleMutation.isPending ||
    createListMutation.isPending ||
    activateListMutation.isPending ||
    updateListMutation.isPending ||
    duplicateListMutation.isPending ||
    deleteListMutation.isPending;

  useHotkeys("shift", () => setIsShiftPressed(true), { keydown: true, keyup: false }, []);
  useHotkeys("shift", () => setIsShiftPressed(false), { keydown: false, keyup: true }, []);

  useEffect(() => {
    if (selectedListId !== null) return;
    if (lists.length === 0) return;
    const active = lists.find((item) => item.isActive);
    setSelectedListId(active ? active.id : lists[0].id);
  }, [lists, selectedListId]);

  useEffect(() => {
    if (!scheduleQuery.data) {
      if (selectedListId === null) {
        setSchedule([]);
      }
      return;
    }

    const normalized = Array.isArray(scheduleQuery.data)
      ? scheduleQuery.data.map((entry) => ({
          ...entry,
          classroomIds: Array.isArray(entry.classroomIds) ? entry.classroomIds : [],
        }))
      : [];

    setSchedule(normalized as ScheduleEntry[]);
  }, [scheduleQuery.data, selectedListId]);

  const classById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const teacherById = useMemo(() => new Map(teachers.map((item) => [item.id, item])), [teachers]);
  const subjectById = useMemo(() => new Map(subjects.map((item) => [item.id, item])), [subjects]);
  const classroomById = useMemo(() => new Map(classrooms.map((item) => [item.id, item])), [classrooms]);

  const scheduleById = useMemo(() => new Map(schedule.map((entry) => [entry.id, entry])), [schedule]);
  const scheduleByCell = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    schedule.forEach((entry) => {
      map.set(createCellKey(entry.classId, entry.day, entry.lessonNumber), entry);
    });
    return map;
  }, [schedule]);

  const teacherOccupancy = useMemo<TeacherLoadMap>(() => {
    const map = new Map<string, number>();
    schedule.forEach((entry) => {
      if (!entry.teacherId) return;
      const key = `${entry.teacherId}:${entry.day}:${entry.lessonNumber}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [schedule]);

  const classroomOccupancy = useMemo<ClassroomLoadMap>(() => {
    const map = new Map<string, number>();
    schedule.forEach((entry) => {
      entry.classroomIds.forEach((classroomId) => {
        const key = `${classroomId}:${entry.day}:${entry.lessonNumber}`;
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return map;
  }, [schedule]);

  const selectedList = useMemo(() => lists.find((item) => item.id === selectedListId), [lists, selectedListId]);

  const activeDragEntry = useMemo(() => {
    if (!activeDragEntryId) return null;
    const entry = scheduleById.get(activeDragEntryId);
    if (!entry) return null;

    const subjectName = entry.subjectId ? subjectById.get(entry.subjectId)?.name || "" : "";
    const teacher = entry.teacherId ? teacherById.get(entry.teacherId) : null;

    return {
      id: entry.id,
      subjectName,
      teacherName: teacher
        ? `${teacher.surname} ${teacher.name[0]}.${teacher.patronymic ? teacher.patronymic[0] + "." : ""}`
        : "",
      classrooms: entry.classroomIds.map((id) => classroomById.get(id)?.number).filter(Boolean) as string[],
    } satisfies ConstructorCellEntry;
  }, [activeDragEntryId, scheduleById, subjectById, teacherById, classroomById]);

  const resetAddLessonModal = useCallback(() => {
    setActiveCell(null);
    setEditingEntryId(null);
    setAddLessonForm({ subjectId: "", teacherId: "", classroomIds: [] });
    setAddLessonError(null);
    setIsSubmittingLesson(false);
    setIsSubjectManuallyChanged(false);
    setIsTeacherManuallyChanged(false);
    setAreClassroomsManuallyChanged(false);
  }, []);

  const openAddLessonModal = useCallback((cell: CellCoordinates) => {
    setActiveCell(cell);
    setEditingEntryId(null);
    setAddLessonForm({ subjectId: "", teacherId: "", classroomIds: [] });
    setAddLessonError(null);
    setIsSubjectManuallyChanged(false);
    setIsTeacherManuallyChanged(false);
    setAreClassroomsManuallyChanged(false);
  }, []);

  const openEditLessonModal = useCallback((cell: CellCoordinates, entry: ScheduleEntry) => {
    setActiveCell(cell);
    setEditingEntryId(entry.id);
    setAddLessonError(null);
    setAddLessonForm({
      subjectId: entry.subjectId ? String(entry.subjectId) : "",
      teacherId: entry.teacherId ? String(entry.teacherId) : "",
      classroomIds: entry.classroomIds,
    });
    setIsSubjectManuallyChanged(false);
    setIsTeacherManuallyChanged(false);
    setAreClassroomsManuallyChanged(false);
  }, []);

  const updateScheduleEntryInState = useCallback((entry: ScheduleEntry) => {
    setSchedule((previous) => {
      const filtered = previous.filter((item) => {
        if (item.id === entry.id) return false;
        return !(item.classId === entry.classId && item.day === entry.day && item.lessonNumber === entry.lessonNumber);
      });
      return [...filtered, entry];
    });
  }, []);

  const getTeacherBusyCount = useCallback((teacherId: number, cell: CellCoordinates, excludeEntryId?: number) => {
    const key = `${teacherId}:${cell.day}:${cell.lessonNumber}`;
    const total = teacherOccupancy.get(key) || 0;
    if (!excludeEntryId) return total;
    const edited = scheduleById.get(excludeEntryId);
    const shouldExclude =
      edited &&
      edited.teacherId === teacherId &&
      edited.day === cell.day &&
      edited.lessonNumber === cell.lessonNumber;
    return shouldExclude ? Math.max(0, total - 1) : total;
  }, [scheduleById, teacherOccupancy]);

  const getClassroomBusyCount = useCallback((classroomId: number, cell: CellCoordinates, excludeEntryId?: number) => {
    const key = `${classroomId}:${cell.day}:${cell.lessonNumber}`;
    const total = classroomOccupancy.get(key) || 0;
    if (!excludeEntryId) return total;
    const edited = scheduleById.get(excludeEntryId);
    const shouldExclude =
      edited &&
      edited.classroomIds.includes(classroomId) &&
      edited.day === cell.day &&
      edited.lessonNumber === cell.lessonNumber;
    return shouldExclude ? Math.max(0, total - 1) : total;
  }, [classroomOccupancy, scheduleById]);

  const handleDeleteFromCell = useCallback(
    async (entry: ScheduleEntry) => {
      await deleteScheduleMutation.mutateAsync({ scheduleId: entry.id });
      setSchedule((previous) => previous.filter((item) => item.id !== entry.id));
    },
    [deleteScheduleMutation],
  );

  const handleCreateLesson = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!selectedListId || !activeCell) return;

      setAddLessonError(null);
      setIsSubmittingLesson(true);

      try {
        const payload: SchedulePayload = {
          listId: selectedListId,
          classId: activeCell.classId,
          day: activeCell.day,
          lessonNumber: activeCell.lessonNumber,
          subjectId: addLessonForm.subjectId ? Number(addLessonForm.subjectId) : null,
          teacherId: addLessonForm.teacherId ? Number(addLessonForm.teacherId) : null,
          classroomIds: addLessonForm.classroomIds,
        };

        const response = await upsertScheduleMutation.mutateAsync(payload);
        const scheduleId = Number(response.scheduleId);

        updateScheduleEntryInState({
          ...payload,
          id: scheduleId,
        });

        resetAddLessonModal();
      } catch (error: any) {
        setAddLessonError(error.message || "Не удалось сохранить запись");
      } finally {
        setIsSubmittingLesson(false);
      }
    },
    [activeCell, addLessonForm, resetAddLessonModal, selectedListId, updateScheduleEntryInState, upsertScheduleMutation],
  );

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
        !!event.activatorEvent && "shiftKey" in event.activatorEvent && !!event.activatorEvent.shiftKey;
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
          classroomIds: sourceEntry.classroomIds,
        };

        const response = await upsertScheduleMutation.mutateAsync(destinationPayload);
        const destinationScheduleId = Number(response.scheduleId);

        if (!shouldDuplicate) {
          await deleteScheduleMutation.mutateAsync({ scheduleId: sourceEntry.id });
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

          next.push({
            ...destinationPayload,
            id: destinationScheduleId,
          });

          return next;
        });
      } catch (error: any) {
        alert(error.message || "Не удалось переместить запись");
      }
    },
    [deleteScheduleMutation, isShiftPressed, resolveOverCellId, scheduleByCell, scheduleById, selectedListId, upsertScheduleMutation],
  );

  const handleActivateList = useCallback(async () => {
    if (!selectedListId) return;

    try {
      await activateListMutation.mutateAsync(selectedListId);
    } catch (error: any) {
      alert(error.message);
    }
  }, [activateListMutation, selectedListId]);

  const openCreateListModal = useCallback(() => {
    setListModalMode("create");
    setListModalName("");
    setListModalError(null);
  }, []);

  const openRenameListModal = useCallback(() => {
    if (!selectedList) return;
    setListModalMode("rename");
    setListModalName(selectedList.name);
    setListModalError(null);
  }, [selectedList]);

  const openDuplicateListModal = useCallback(() => {
    if (!selectedList) return;
    setListModalMode("duplicate");
    setListModalName(`${selectedList.name} (копия)`);
    setListModalError(null);
  }, [selectedList]);

  const closeListModal = useCallback(() => {
    setListModalMode(null);
    setListModalName("");
    setListModalError(null);
  }, []);

  const handleListModalSubmit = useCallback(async () => {
    if (!listModalName.trim() || !listModalMode) return;
    setListModalError(null);

    try {
      if (listModalMode === "create") {
        const payload = await createListMutation.mutateAsync({ name: listModalName.trim() });
        if (payload.insertId) setSelectedListId(payload.insertId);
      } else if (listModalMode === "rename") {
        if (!selectedListId) return;
        await updateListMutation.mutateAsync({ id: selectedListId, payload: { name: listModalName.trim() } });
      } else if (listModalMode === "duplicate") {
        if (!selectedListId) return;
        const payload = await duplicateListMutation.mutateAsync({ id: selectedListId, name: listModalName.trim() });
        if (payload.insertId) setSelectedListId(payload.insertId);
      }
      closeListModal();
    } catch (error: any) {
      setListModalError(error.message || "Не удалось выполнить операцию с листом");
    }
  }, [
    closeListModal,
    createListMutation,
    duplicateListMutation,
    listModalMode,
    listModalName,
    selectedListId,
    updateListMutation,
  ]);

  const handleDeleteList = useCallback(async () => {
    if (!selectedListId || !selectedList) return;
    if (!confirm(`Удалить лист «${selectedList.name}»?`)) return;

    try {
      await deleteListMutation.mutateAsync(selectedListId);
      setSelectedListId(null);
      setSchedule([]);
    } catch (error: any) {
      alert(error.message || "Не удалось удалить лист");
    }
  }, [deleteListMutation, selectedList, selectedListId]);

  const listModalTitle = useMemo(() => {
    if (listModalMode === "rename") return "Переименовать лист";
    if (listModalMode === "duplicate") return "Дублировать лист";
    return "Создать новый лист расписания";
  }, [listModalMode]);

  const listModalSubmitLabel = useMemo(() => {
    if (listModalMode === "rename") return "Сохранить";
    if (listModalMode === "duplicate") return "Дублировать";
    return "Создать";
  }, [listModalMode]);

  const activeCellTeacherBusy = useMemo(() => {
    if (!activeCell || !addLessonForm.teacherId) return false;
    const teacherId = Number(addLessonForm.teacherId);
    return getTeacherBusyCount(teacherId, activeCell, editingEntryId ?? undefined) > 0;
  }, [activeCell, addLessonForm.teacherId, editingEntryId, getTeacherBusyCount]);

  const teacherAutocompletePriority = useMemo(() => {
    const map = new Map<number, number>();
    const payload = autocompleteQuery.data;
    if (!payload) return map;

    payload.teachersBySubject.forEach((item) => {
      map.set(item.teacherId, Math.max(map.get(item.teacherId) ?? 0, 200 + item.count));
    });
    payload.teachersByClass.forEach((item) => {
      map.set(item.teacherId, Math.max(map.get(item.teacherId) ?? 0, 100 + item.count));
    });

    return map;
  }, [autocompleteQuery.data]);

  const subjectAutocompletePriority = useMemo(() => {
    const map = new Map<number, number>();
    const payload = autocompleteQuery.data;
    if (!payload) return map;
    payload.subjectsByTeacher.forEach((item) => {
      map.set(item.subjectId, item.count);
    });
    return map;
  }, [autocompleteQuery.data]);

  const teacherSuggestions = useMemo(() => {
    const payload = autocompleteQuery.data;
    if (!payload) return [];

    return payload.teachersBySubject
      .map((item) => {
        const teacher = teacherById.get(item.teacherId);
        if (!teacher) return null;
        return {
          teacherId: item.teacherId,
          label: `${teacher.surname} ${teacher.name[0]}.${teacher.patronymic ? teacher.patronymic[0] + "." : ""}`,
        };
      })
      .filter(Boolean) as { teacherId: number; label: string }[];
  }, [autocompleteQuery.data, teacherById]);

  const subjectSuggestions = useMemo(() => {
    const payload = autocompleteQuery.data;
    if (!payload) return [];

    return payload.subjectsByTeacher
      .map((item) => {
        const subject = subjectById.get(item.subjectId);
        if (!subject) return null;
        return { subjectId: item.subjectId, name: subject.name };
      })
      .filter(Boolean) as { subjectId: number; name: string }[];
  }, [autocompleteQuery.data, subjectById]);

  const classroomSuggestions = useMemo(() => {
    const payload = autocompleteQuery.data;
    if (!payload) return [];

    return payload.classroomsByTeacher
      .map((item) => {
        const classroom = classroomById.get(item.classroomId);
        if (!classroom) return null;
        return {
          classroomId: item.classroomId,
          number: classroom.number,
          score: item.count,
        };
      })
      .filter(Boolean) as { classroomId: number; number: string; score: number }[];
  }, [autocompleteQuery.data, classroomById]);

  useEffect(() => {
    if (!activeCell) return;
    if (editingEntryId !== null) return;
    if (isTeacherManuallyChanged) return;
    if (addLessonForm.teacherId) return;
    if (!addLessonForm.subjectId) return;

    const bestTeacherId = teacherSuggestions[0]?.teacherId;
    if (!bestTeacherId) return;

    setAddLessonForm((previous) =>
      previous.teacherId ? previous : { ...previous, teacherId: String(bestTeacherId) },
    );
  }, [activeCell, addLessonForm.subjectId, addLessonForm.teacherId, editingEntryId, isTeacherManuallyChanged, teacherSuggestions]);

  useEffect(() => {
    if (!activeCell) return;
    if (editingEntryId !== null) return;
    if (isSubjectManuallyChanged) return;
    if (addLessonForm.subjectId) return;
    if (!addLessonForm.teacherId) return;

    const topSubjectId = subjectSuggestions[0]?.subjectId;
    if (!topSubjectId) return;

    setAddLessonForm((previous) =>
      previous.subjectId ? previous : { ...previous, subjectId: String(topSubjectId) },
    );
  }, [activeCell, addLessonForm.subjectId, addLessonForm.teacherId, editingEntryId, isSubjectManuallyChanged, subjectSuggestions]);

  useEffect(() => {
    if (!activeCell) return;
    if (editingEntryId !== null) return;
    if (areClassroomsManuallyChanged) return;
    if (addLessonForm.classroomIds.length > 0) return;
    if (!addLessonForm.teacherId) return;

    const topClassroomId = classroomSuggestions[0]?.classroomId;
    if (!topClassroomId) return;

    setAddLessonForm((previous) =>
      previous.classroomIds.length > 0 ? previous : { ...previous, classroomIds: [topClassroomId] },
    );
  }, [activeCell, addLessonForm.classroomIds.length, addLessonForm.teacherId, areClassroomsManuallyChanged, classroomSuggestions, editingEntryId]);

  const lessonModalTitle = useMemo(() => {
    if (!activeCell) return "Новый урок";
    const className = classById.get(activeCell.classId)?.displayName || "";
    return `${editingEntryId ? "Редактирование" : "Новый урок"}: ${className}, ${activeCell.lessonNumber} урок`;
  }, [activeCell, classById, editingEntryId]);

  const subjectOptions = useMemo(() => {
    return [...subjects].sort((a, b) => {
      const priorityDiff = (subjectAutocompletePriority.get(b.id) ?? 0) - (subjectAutocompletePriority.get(a.id) ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      return a.name.localeCompare(b.name, "ru");
    });
  }, [subjectAutocompletePriority, subjects]);

  const teacherOptions = useMemo(() => {
    if (!activeCell) return [];

    return teachers
      .map((teacher) => ({
        id: teacher.id,
        label: `${teacher.surname} ${teacher.name[0]}.${teacher.patronymic ? teacher.patronymic[0] + "." : ""}`,
        isBusy: getTeacherBusyCount(teacher.id, activeCell, editingEntryId ?? undefined) > 0,
        priority: teacherAutocompletePriority.get(teacher.id) ?? 0,
      }))
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (a.isBusy !== b.isBusy) return Number(a.isBusy) - Number(b.isBusy);
        return a.label.localeCompare(b.label, "ru");
      })
      .map(({ id, label, isBusy }) => ({ id, label, isBusy }));
  }, [activeCell, editingEntryId, getTeacherBusyCount, teacherAutocompletePriority, teachers]);

  const classroomOptions = useMemo(() => {
    if (!activeCell) return [];
    const classroomPriority = new Map<number, number>();
    classroomSuggestions.forEach((item) => {
      classroomPriority.set(item.classroomId, item.score);
    });

    return classrooms
      .map((classroom) => ({
        id: classroom.id,
        number: classroom.number,
        isBusy: getClassroomBusyCount(classroom.id, activeCell, editingEntryId ?? undefined) > 0,
        priority: classroomPriority.get(classroom.id) ?? 0,
      }))
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (a.isBusy !== b.isBusy) return Number(a.isBusy) - Number(b.isBusy);
        return a.number.localeCompare(b.number, "ru");
      })
      .map(({ id, number, isBusy }) => ({ id, number, isBusy }));
  }, [activeCell, classrooms, classroomSuggestions, editingEntryId, getClassroomBusyCount]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader
        title="Конструктор расписания"
        subtitle={
          saving ? (
            <span className="inline-flex items-center gap-1.5">
              <AppIcon name="saving" className="h-4 w-4" />
              Сохранение...
            </span>
          ) : selectedList ? (
            `Лист: ${selectedList.name}${selectedList.isActive ? " (активный)" : ""}`
          ) : undefined
        }
      />

      <ConstructorToolbar
        lists={lists}
        selectedListId={selectedListId}
        selectedListIsActive={!!selectedList?.isActive}
        isShiftPressed={isShiftPressed}
        onSelectList={setSelectedListId}
        onActivateList={handleActivateList}
        onCreateList={openCreateListModal}
        onRenameList={openRenameListModal}
        onDuplicateList={openDuplicateListModal}
        onDeleteList={handleDeleteList}
      />

      <ConstructorListModal
        isOpen={listModalMode !== null}
        onClose={closeListModal}
        name={listModalName}
        error={listModalError}
        isSubmitting={createListMutation.isPending || updateListMutation.isPending || duplicateListMutation.isPending}
        onNameChange={setListModalName}
        onSubmit={handleListModalSubmit}
        title={listModalTitle}
        submitLabel={listModalSubmitLabel}
      />

      <ConstructorLessonModal
        isOpen={!!activeCell}
        onClose={resetAddLessonModal}
        title={lessonModalTitle}
        error={addLessonError}
        form={addLessonForm}
        subjects={subjectOptions}
        teacherOptions={teacherOptions}
        classroomOptions={classroomOptions}
        isSubmitting={isSubmittingLesson}
        isTeacherBusy={activeCellTeacherBusy}
        isEditing={editingEntryId !== null}
        autocompleteLoading={autocompleteQuery.isLoading}
        teacherSuggestions={teacherSuggestions}
        subjectSuggestions={subjectSuggestions}
        classroomSuggestions={classroomSuggestions}
        onSubmit={handleCreateLesson}
        onSubjectChange={(value) => {
          setIsSubjectManuallyChanged(true);
          setAddLessonForm((previous) => ({ ...previous, subjectId: value }));
        }}
        onTeacherChange={(value) => {
          setIsTeacherManuallyChanged(true);
          setAddLessonForm((previous) => ({ ...previous, teacherId: value }));
        }}
        onToggleClassroom={(classroomId) => {
          setAreClassroomsManuallyChanged(true);
          setAddLessonForm((previous) => {
            const selected = previous.classroomIds.includes(classroomId);
            return {
              ...previous,
              classroomIds: selected
                ? previous.classroomIds.filter((id) => id !== classroomId)
                : [...previous.classroomIds, classroomId],
            };
          });
        }}
        onApplyTeacherSuggestion={(teacherId) => {
          setIsTeacherManuallyChanged(true);
          setAddLessonForm((previous) => ({ ...previous, teacherId: String(teacherId) }));
        }}
        onApplyClassroomSuggestion={(classroomId) => {
          setAreClassroomsManuallyChanged(true);
          setAddLessonForm((previous) => {
            if (previous.classroomIds.includes(classroomId)) return previous;
            return { ...previous, classroomIds: [...previous.classroomIds, classroomId] };
          });
        }}
      />

      {!selectedListId ? (
        <Card>
          <EmptyState icon="schedule" title="Выберите или создайте лист расписания" />
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <EmptyState icon="classes" title="Сначала добавьте классы в разделе «Классы»" />
        </Card>
      ) : (
        <DndContext
          collisionDetection={(args) => {
            const pointerCollisions = pointerWithin(args);
            return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="overflow-x-auto rounded-lg border border-border bg-bg-card">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="sticky top-0 z-10 w-[70px] border border-border bg-bg-tertiary px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">День</th>
                  <th className="sticky top-0 z-10 w-10 border border-border bg-bg-tertiary px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">Урок</th>
                  {classes.map((classItem) => (
                    <th key={classItem.id} className={`sticky top-0 z-10 ${CONSTRUCTOR_HEADER_CELL_SIZE_CLASS} border border-border bg-bg-tertiary px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary`}>
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
                          <td rowSpan={LESSONS.length} className="min-w-[44px] border border-border bg-accent-primary-light px-2 py-2 text-center text-[13px] font-bold text-accent-primary [writing-mode:vertical-rl]">
                            {day.name}
                          </td>
                        ) : null}
                        <td className="w-10 border border-border bg-bg-tertiary px-2 py-2 text-center font-semibold text-text-secondary">{lessonNumber}</td>
                        {classes.map((classItem) => {
                          const cellKey = createCellKey(classItem.id, day.id, lessonNumber);
                          const cellDndId = createCellDndId(classItem.id, day.id, lessonNumber);
                          const entry = scheduleByCell.get(cellKey) || null;

                          const teacherBusy = !!entry?.teacherId && getTeacherBusyCount(entry.teacherId, { classId: classItem.id, day: day.id, lessonNumber }, entry.id) > 0;

                          const subjectName = entry?.subjectId ? subjectById.get(entry.subjectId)?.name || "" : "";
                          const teacher = entry?.teacherId ? teacherById.get(entry.teacherId) : null;
                          const teacherName = teacher
                            ? `${teacher.surname} ${teacher.name[0]}.${teacher.patronymic ? teacher.patronymic[0] + "." : ""}`
                            : "";
                          const classroomsText = entry
                            ? entry.classroomIds.map((id) => classroomById.get(id)?.number).filter(Boolean) as string[]
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
                                      classrooms: classroomsText,
                                    }
                                  : null
                              }
                              onAdd={() => openAddLessonModal({ classId: classItem.id, day: day.id, lessonNumber })}
                              onEdit={() => {
                                if (!entry) return;
                                openEditLessonModal({ classId: classItem.id, day: day.id, lessonNumber }, entry);
                              }}
                              onDelete={() => {
                                if (!entry) return;
                                handleDeleteFromCell(entry).catch((error: any) => {
                                  alert(error.message || "Не удалось удалить запись");
                                });
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
      )}
    </div>
  );
}
*/
