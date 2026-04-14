"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { CellCoordinates, ClassItem, Classroom, ScheduleEntry, SchedulePayload, Subject, Teacher } from "@/components/schedule/constructor-types";
import { useScheduleAutocompleteQuery } from "@/lib/react-query";

type UseConstructorLessonEditorParams = {
  selectedListId: number | null;
  classById: Map<number, ClassItem>;
  subjectById: Map<number, Subject>;
  teacherById: Map<number, Teacher>;
  classroomById: Map<number, Classroom>;
  subjects: Subject[];
  teachers: Teacher[];
  classrooms: Classroom[];
  getTeacherBusyCount: (teacherId: number, cell: CellCoordinates, excludeEntryId?: number) => number;
  getClassroomBusyCount: (classroomId: number, cell: CellCoordinates, excludeEntryId?: number) => number;
  upsertCell: (payload: SchedulePayload) => Promise<{ scheduleId: number }>;
  updateScheduleEntryInState: (entry: ScheduleEntry) => void;
};

const unique = (values: number[]) => Array.from(new Set(values));

export function useConstructorLessonEditor({
  selectedListId,
  classById,
  subjectById,
  teacherById,
  classroomById,
  subjects,
  teachers,
  classrooms,
  getTeacherBusyCount,
  getClassroomBusyCount,
  upsertCell,
  updateScheduleEntryInState,
}: UseConstructorLessonEditorParams) {
  const [activeCell, setActiveCell] = useState<CellCoordinates | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [addLessonForm, setAddLessonForm] = useState({ subjectId: "", teacherIds: [] as number[], classroomIds: [] as number[] });
  const [addLessonError, setAddLessonError] = useState<string | null>(null);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);
  const [isSubjectManuallyChanged, setIsSubjectManuallyChanged] = useState(false);
  const [isTeacherManuallyChanged, setIsTeacherManuallyChanged] = useState(false);
  const [areClassroomsManuallyChanged, setAreClassroomsManuallyChanged] = useState(false);

  const selectedSubjectIdForAutocomplete = addLessonForm.subjectId ? Number(addLessonForm.subjectId) : null;
  const selectedTeacherIdForAutocomplete = addLessonForm.teacherIds[0] ?? null;
  const autocompleteQuery = useScheduleAutocompleteQuery(
    activeCell
      ? { classId: activeCell.classId, subjectId: selectedSubjectIdForAutocomplete, teacherId: selectedTeacherIdForAutocomplete }
      : null,
    !!activeCell,
  );

  const resetAddLessonModal = useCallback(() => {
    setActiveCell(null);
    setEditingEntryId(null);
    setAddLessonForm({ subjectId: "", teacherIds: [], classroomIds: [] });
    setAddLessonError(null);
    setIsSubmittingLesson(false);
    setIsSubjectManuallyChanged(false);
    setIsTeacherManuallyChanged(false);
    setAreClassroomsManuallyChanged(false);
  }, []);

  const openAddLessonModal = useCallback((cell: CellCoordinates) => {
    setActiveCell(cell);
    setEditingEntryId(null);
    setAddLessonForm({ subjectId: "", teacherIds: [], classroomIds: [] });
    setAddLessonError(null);
    setIsSubjectManuallyChanged(false);
    setIsTeacherManuallyChanged(false);
    setAreClassroomsManuallyChanged(false);
  }, []);

  const openEditLessonModal = useCallback((cell: CellCoordinates, entry: ScheduleEntry) => {
    setActiveCell(cell);
    setEditingEntryId(entry.id);
    setAddLessonError(null);
    const nextTeacherIds = entry.teacherIds && entry.teacherIds.length > 0
      ? entry.teacherIds
      : entry.teacherId
        ? [entry.teacherId]
        : [];

    setAddLessonForm({
      subjectId: entry.subjectId ? String(entry.subjectId) : "",
      teacherIds: nextTeacherIds,
      classroomIds: entry.classroomIds,
    });
    setIsSubjectManuallyChanged(false);
    setIsTeacherManuallyChanged(false);
    setAreClassroomsManuallyChanged(false);
  }, []);

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
          teacherIds: unique(addLessonForm.teacherIds),
          teacherId: addLessonForm.teacherIds[0] ?? null,
          classroomIds: unique(addLessonForm.classroomIds),
        };
        const response = await upsertCell(payload);
        updateScheduleEntryInState({ ...payload, id: Number(response.scheduleId), teacherId: payload.teacherId ?? null });
        resetAddLessonModal();
      } catch (error: any) {
        setAddLessonError(error.message || "Не удалось сохранить запись");
      } finally {
        setIsSubmittingLesson(false);
      }
    },
    [activeCell, addLessonForm, resetAddLessonModal, selectedListId, updateScheduleEntryInState, upsertCell],
  );

  const activeCellTeacherBusy = useMemo(() => {
    if (!activeCell || addLessonForm.teacherIds.length === 0) return false;
    return addLessonForm.teacherIds.some((teacherId) =>
      getTeacherBusyCount(teacherId, activeCell, editingEntryId ?? undefined) > 0,
    );
  }, [activeCell, addLessonForm.teacherIds, editingEntryId, getTeacherBusyCount]);

  const teacherAutocompletePriority = useMemo(() => {
    const map = new Map<number, number>();
    const payload = autocompleteQuery.data;
    if (!payload) return map;
    payload.teachersBySubject.forEach((item) => map.set(item.teacherId, Math.max(map.get(item.teacherId) ?? 0, 200 + item.count)));
    payload.teachersByClass.forEach((item) => map.set(item.teacherId, Math.max(map.get(item.teacherId) ?? 0, 100 + item.count)));
    return map;
  }, [autocompleteQuery.data]);

  const subjectAutocompletePriority = useMemo(() => {
    const map = new Map<number, number>();
    autocompleteQuery.data?.subjectsByTeacher.forEach((item) => map.set(item.subjectId, item.count));
    return map;
  }, [autocompleteQuery.data]);

  const teacherSuggestions = useMemo(
    () =>
      (autocompleteQuery.data?.teachersBySubject ?? [])
        .map((item) => {
          const teacher = teacherById.get(item.teacherId);
          if (!teacher) return null;
          return { teacherId: item.teacherId, label: `${teacher.surname} ${teacher.name[0]}.${teacher.patronymic ? teacher.patronymic[0] + "." : ""}` };
        })
        .filter(Boolean) as { teacherId: number; label: string }[],
    [autocompleteQuery.data, teacherById],
  );

  const subjectSuggestions = useMemo(
    () =>
      (autocompleteQuery.data?.subjectsByTeacher ?? [])
        .map((item) => {
          const subject = subjectById.get(item.subjectId);
          if (!subject) return null;
          return { subjectId: item.subjectId, name: subject.name };
        })
        .filter(Boolean) as { subjectId: number; name: string }[],
    [autocompleteQuery.data, subjectById],
  );

  const classroomSuggestions = useMemo(
    () =>
      (autocompleteQuery.data?.classroomsByTeacher ?? [])
        .map((item) => {
          const classroom = classroomById.get(item.classroomId);
          if (!classroom) return null;
          return { classroomId: item.classroomId, number: classroom.number, score: item.count };
        })
        .filter(Boolean) as { classroomId: number; number: string; score: number }[],
    [autocompleteQuery.data, classroomById],
  );

  useEffect(() => {
    if (!activeCell || editingEntryId !== null || isTeacherManuallyChanged || addLessonForm.teacherIds.length > 0 || !addLessonForm.subjectId) return;
    const bestTeacherId = teacherSuggestions[0]?.teacherId;
    if (!bestTeacherId) return;
    setAddLessonForm((previous) => (previous.teacherIds.length > 0 ? previous : { ...previous, teacherIds: [bestTeacherId] }));
  }, [activeCell, addLessonForm.subjectId, addLessonForm.teacherIds.length, editingEntryId, isTeacherManuallyChanged, teacherSuggestions]);

  useEffect(() => {
    if (!activeCell || editingEntryId !== null || isSubjectManuallyChanged || addLessonForm.subjectId || addLessonForm.teacherIds.length === 0) return;
    const topSubjectId = subjectSuggestions[0]?.subjectId;
    if (!topSubjectId) return;
    setAddLessonForm((previous) => (previous.subjectId ? previous : { ...previous, subjectId: String(topSubjectId) }));
  }, [activeCell, addLessonForm.subjectId, addLessonForm.teacherIds.length, editingEntryId, isSubjectManuallyChanged, subjectSuggestions]);

  useEffect(() => {
    if (!activeCell || editingEntryId !== null || areClassroomsManuallyChanged || addLessonForm.classroomIds.length > 0 || addLessonForm.teacherIds.length === 0) return;

    const defaultsFromTeachers = unique(
      addLessonForm.teacherIds
        .map((teacherId) => teachers.find((teacher) => teacher.id === teacherId)?.defaultClassroomId ?? null)
        .filter((classroomId): classroomId is number => classroomId !== null && classroomId > 0),
    );

    if (defaultsFromTeachers.length > 0) {
      setAddLessonForm((previous) => (previous.classroomIds.length > 0 ? previous : { ...previous, classroomIds: defaultsFromTeachers }));
      return;
    }

    const topClassroomId = classroomSuggestions[0]?.classroomId;
    if (!topClassroomId) return;
    setAddLessonForm((previous) => (previous.classroomIds.length > 0 ? previous : { ...previous, classroomIds: [topClassroomId] }));
  }, [
    activeCell,
    addLessonForm.classroomIds.length,
    addLessonForm.teacherIds,
    areClassroomsManuallyChanged,
    classroomSuggestions,
    editingEntryId,
    teachers,
  ]);

  const lessonModalTitle = useMemo(() => {
    if (!activeCell) return "Новый урок";
    const className = classById.get(activeCell.classId)?.displayName || "";
    return `${editingEntryId ? "Редактирование" : "Новый урок"}: ${className}, ${activeCell.lessonNumber} урок`;
  }, [activeCell, classById, editingEntryId]);

  const subjectOptions = useMemo(
    () =>
      [...subjects].sort((a, b) => {
        const priorityDiff = (subjectAutocompletePriority.get(b.id) ?? 0) - (subjectAutocompletePriority.get(a.id) ?? 0);
        if (priorityDiff !== 0) return priorityDiff;
        return a.name.localeCompare(b.name, "ru");
      }),
    [subjectAutocompletePriority, subjects],
  );

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
    classroomSuggestions.forEach((item) => classroomPriority.set(item.classroomId, item.score));
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

  return {
    activeCell,
    addLessonForm,
    addLessonError,
    isSubmittingLesson,
    activeCellTeacherBusy,
    isEditing: editingEntryId !== null,
    lessonModalTitle,
    subjectOptions,
    teacherOptions,
    classroomOptions,
    autocompleteLoading: autocompleteQuery.isLoading,
    teacherSuggestions,
    subjectSuggestions,
    classroomSuggestions,
    resetAddLessonModal,
    openAddLessonModal,
    openEditLessonModal,
    handleCreateLesson,
    onSubjectChange: (value: string) => {
      setIsSubjectManuallyChanged(true);
      setAddLessonForm((previous) => ({ ...previous, subjectId: value }));
    },
    onToggleTeacher: (teacherId: number) => {
      setIsTeacherManuallyChanged(true);
      setAddLessonForm((previous) => {
        const selected = previous.teacherIds.includes(teacherId);
        return {
          ...previous,
          teacherIds: selected
            ? previous.teacherIds.filter((id) => id !== teacherId)
            : [...previous.teacherIds, teacherId],
        };
      });
    },
    onToggleClassroom: (classroomId: number) => {
      setAreClassroomsManuallyChanged(true);
      setAddLessonForm((previous) => {
        const selected = previous.classroomIds.includes(classroomId);
        return {
          ...previous,
          classroomIds: selected ? previous.classroomIds.filter((id) => id !== classroomId) : [...previous.classroomIds, classroomId],
        };
      });
    },
    onApplyTeacherSuggestion: (teacherId: number) => {
      setIsTeacherManuallyChanged(true);
      setAddLessonForm((previous) => {
        if (previous.teacherIds.includes(teacherId)) return previous;
        return { ...previous, teacherIds: [...previous.teacherIds, teacherId] };
      });
    },
    onApplyClassroomSuggestion: (classroomId: number) => {
      setAreClassroomsManuallyChanged(true);
      setAddLessonForm((previous) => {
        if (previous.classroomIds.includes(classroomId)) return previous;
        return { ...previous, classroomIds: [...previous.classroomIds, classroomId] };
      });
    },
  };
}
