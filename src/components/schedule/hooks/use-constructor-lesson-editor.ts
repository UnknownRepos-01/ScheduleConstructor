"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  formatTeacherShortName,
  getEntryTeacherIds,
  uniqueNumbers,
} from "@/components/schedule/constructor-entry-utils";
import type {
  AddLessonForm,
  CellCoordinates,
  ClassItem,
  Classroom,
  ScheduleEntry,
  SchedulePayload,
  Subject,
  Teacher,
} from "@/components/schedule/constructor-types";
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

type TeacherSuggestion = {
  teacherId: number;
  label: string;
};

type SubjectSuggestion = {
  subjectId: number;
  name: string;
};

type ClassroomSuggestion = {
  classroomId: number;
  number: string;
  score: number;
};

const EMPTY_FORM: AddLessonForm = {
  subjectId: "",
  teacherIds: [],
  classroomIds: [],
};

const SAVE_LESSON_ERROR = "Не удалось сохранить запись";
const NEW_LESSON_LABEL = "Новый урок";
const EDIT_LESSON_LABEL = "Редактирование";

function toggleNumber(values: number[], value: number): number[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function appendUnique(values: number[], value: number): number[] {
  return values.includes(value) ? values : [...values, value];
}

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
  const [addLessonForm, setAddLessonForm] = useState<AddLessonForm>(EMPTY_FORM);
  const [addLessonError, setAddLessonError] = useState<string | null>(null);
  const [isSubmittingLesson, setIsSubmittingLesson] = useState(false);
  const [isSubjectManuallyChanged, setIsSubjectManuallyChanged] = useState(false);
  const [isTeacherManuallyChanged, setIsTeacherManuallyChanged] = useState(false);
  const [areClassroomsManuallyChanged, setAreClassroomsManuallyChanged] = useState(false);

  const selectedSubjectIdForAutocomplete = addLessonForm.subjectId ? Number(addLessonForm.subjectId) : null;
  const selectedTeacherIdForAutocomplete = addLessonForm.teacherIds[0] ?? null;

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

  const resetAddLessonModal = useCallback(() => {
    setActiveCell(null);
    setEditingEntryId(null);
    setAddLessonForm(EMPTY_FORM);
    setAddLessonError(null);
    setIsSubmittingLesson(false);
    setIsSubjectManuallyChanged(false);
    setIsTeacherManuallyChanged(false);
    setAreClassroomsManuallyChanged(false);
  }, []);

  const openAddLessonModal = useCallback((cell: CellCoordinates) => {
    setActiveCell(cell);
    setEditingEntryId(null);
    setAddLessonForm(EMPTY_FORM);
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
      teacherIds: getEntryTeacherIds(entry),
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
        const teacherIds = uniqueNumbers(addLessonForm.teacherIds);
        const payload: SchedulePayload = {
          listId: selectedListId,
          classId: activeCell.classId,
          day: activeCell.day,
          lessonNumber: activeCell.lessonNumber,
          subjectId: addLessonForm.subjectId ? Number(addLessonForm.subjectId) : null,
          teacherIds,
          teacherId: teacherIds[0] ?? null,
          classroomIds: uniqueNumbers(addLessonForm.classroomIds),
        };

        const response = await upsertCell(payload);
        updateScheduleEntryInState({ ...payload, id: Number(response.scheduleId), teacherId: payload.teacherId ?? null });
        resetAddLessonModal();
      } catch (error: any) {
        setAddLessonError(error.message || SAVE_LESSON_ERROR);
      } finally {
        setIsSubmittingLesson(false);
      }
    },
    [activeCell, addLessonForm, resetAddLessonModal, selectedListId, updateScheduleEntryInState, upsertCell],
  );

  const activeCellTeacherBusy = useMemo(() => {
    if (!activeCell || addLessonForm.teacherIds.length === 0) return false;
    return addLessonForm.teacherIds.some(
      (teacherId) => getTeacherBusyCount(teacherId, activeCell, editingEntryId ?? undefined) > 0,
    );
  }, [activeCell, addLessonForm.teacherIds, editingEntryId, getTeacherBusyCount]);

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
    autocompleteQuery.data?.subjectsByTeacher.forEach((item) => {
      map.set(item.subjectId, item.count);
    });
    return map;
  }, [autocompleteQuery.data]);

  const teacherSuggestions = useMemo<TeacherSuggestion[]>(() => {
    return (autocompleteQuery.data?.teachersBySubject ?? [])
      .map((item) => {
        const teacher = teacherById.get(item.teacherId);
        if (!teacher) return null;
        return { teacherId: item.teacherId, label: formatTeacherShortName(teacher) };
      })
      .filter(Boolean) as TeacherSuggestion[];
  }, [autocompleteQuery.data, teacherById]);

  const subjectSuggestions = useMemo<SubjectSuggestion[]>(() => {
    return (autocompleteQuery.data?.subjectsByTeacher ?? [])
      .map((item) => {
        const subject = subjectById.get(item.subjectId);
        if (!subject) return null;
        return { subjectId: item.subjectId, name: subject.name };
      })
      .filter(Boolean) as SubjectSuggestion[];
  }, [autocompleteQuery.data, subjectById]);

  const classroomSuggestions = useMemo<ClassroomSuggestion[]>(() => {
    return (autocompleteQuery.data?.classroomsByTeacher ?? [])
      .map((item) => {
        const classroom = classroomById.get(item.classroomId);
        if (!classroom) return null;
        return { classroomId: item.classroomId, number: classroom.number, score: item.count };
      })
      .filter(Boolean) as ClassroomSuggestion[];
  }, [autocompleteQuery.data, classroomById]);

  useEffect(() => {
    if (!activeCell || editingEntryId !== null || isTeacherManuallyChanged || addLessonForm.teacherIds.length > 0) return;
    if (!addLessonForm.subjectId) return;

    const bestTeacherId = teacherSuggestions[0]?.teacherId;
    if (!bestTeacherId) return;

    setAddLessonForm((previous) =>
      previous.teacherIds.length > 0 ? previous : { ...previous, teacherIds: [bestTeacherId] },
    );
  }, [
    activeCell,
    addLessonForm.subjectId,
    addLessonForm.teacherIds.length,
    editingEntryId,
    isTeacherManuallyChanged,
    teacherSuggestions,
  ]);

  useEffect(() => {
    if (!activeCell || editingEntryId !== null || isSubjectManuallyChanged || addLessonForm.subjectId) return;
    if (addLessonForm.teacherIds.length === 0) return;

    const topSubjectId = subjectSuggestions[0]?.subjectId;
    if (!topSubjectId) return;

    setAddLessonForm((previous) =>
      previous.subjectId ? previous : { ...previous, subjectId: String(topSubjectId) },
    );
  }, [
    activeCell,
    addLessonForm.subjectId,
    addLessonForm.teacherIds.length,
    editingEntryId,
    isSubjectManuallyChanged,
    subjectSuggestions,
  ]);

  useEffect(() => {
    if (!activeCell || editingEntryId !== null || areClassroomsManuallyChanged || addLessonForm.classroomIds.length > 0) return;
    if (addLessonForm.teacherIds.length === 0) return;

    const defaultClassroomIds = uniqueNumbers(
      addLessonForm.teacherIds
        .map((teacherId) => teacherById.get(teacherId)?.defaultClassroomId ?? null)
        .filter((classroomId): classroomId is number => classroomId !== null && classroomId > 0),
    );

    if (defaultClassroomIds.length > 0) {
      setAddLessonForm((previous) =>
        previous.classroomIds.length > 0 ? previous : { ...previous, classroomIds: defaultClassroomIds },
      );
      return;
    }

    const suggestedClassroomId = classroomSuggestions[0]?.classroomId;
    if (!suggestedClassroomId) return;

    setAddLessonForm((previous) =>
      previous.classroomIds.length > 0 ? previous : { ...previous, classroomIds: [suggestedClassroomId] },
    );
  }, [
    activeCell,
    addLessonForm.classroomIds.length,
    addLessonForm.teacherIds,
    areClassroomsManuallyChanged,
    classroomSuggestions,
    editingEntryId,
    teacherById,
  ]);

  const lessonModalTitle = useMemo(() => {
    if (!activeCell) return NEW_LESSON_LABEL;
    const className = classById.get(activeCell.classId)?.displayName || "";
    return `${editingEntryId ? EDIT_LESSON_LABEL : NEW_LESSON_LABEL}: ${className}, ${activeCell.lessonNumber} урок`;
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
        label: formatTeacherShortName(teacher),
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
      setAddLessonForm((previous) => ({
        ...previous,
        teacherIds: toggleNumber(previous.teacherIds, teacherId),
      }));
    },
    onToggleClassroom: (classroomId: number) => {
      setAreClassroomsManuallyChanged(true);
      setAddLessonForm((previous) => ({
        ...previous,
        classroomIds: toggleNumber(previous.classroomIds, classroomId),
      }));
    },
    onApplyTeacherSuggestion: (teacherId: number) => {
      setIsTeacherManuallyChanged(true);
      setAddLessonForm((previous) => ({
        ...previous,
        teacherIds: appendUnique(previous.teacherIds, teacherId),
      }));
    },
    onApplyClassroomSuggestion: (classroomId: number) => {
      setAreClassroomsManuallyChanged(true);
      setAddLessonForm((previous) => ({
        ...previous,
        classroomIds: appendUnique(previous.classroomIds, classroomId),
      }));
    },
  };
}
