"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createCellKey } from "@/components/schedule/constructor-dnd-utils";
import type { ClassItem, Classroom, ListItem, ScheduleEntry, Subject, Teacher } from "@/components/schedule/constructor-types";
import { useConstructorDnd } from "@/components/schedule/hooks/use-constructor-dnd";
import { useConstructorLessonEditor } from "@/components/schedule/hooks/use-constructor-lesson-editor";
import { useConstructorListManagement } from "@/components/schedule/hooks/use-constructor-list-management";
import {
  useClassesQuery,
  useClassroomsQuery,
  useDeleteScheduleCellMutation,
  useListsQuery,
  useScheduleByListQuery,
  useSubjectsQuery,
  useTeachersQuery,
  useUpsertScheduleCellMutation,
} from "@/lib/react-query";

type TeacherLoadMap = Map<string, number>;
type ClassroomLoadMap = Map<string, number>;

export function useConstructorPageModel() {
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);

  const listsQuery = useListsQuery();
  const classesQuery = useClassesQuery();
  const teachersQuery = useTeachersQuery();
  const subjectsQuery = useSubjectsQuery();
  const classroomsQuery = useClassroomsQuery();
  const scheduleQuery = useScheduleByListQuery(selectedListId);

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
          teacherIds: Array.isArray(entry.teacherIds)
            ? entry.teacherIds
            : entry.teacherId
              ? [entry.teacherId]
              : [],
          classroomIds: Array.isArray(entry.classroomIds) ? entry.classroomIds : [],
        }))
      : [];

    setSchedule(normalized as ScheduleEntry[]);
  }, [scheduleQuery.data, selectedListId]);

  const classById = useMemo(() => new Map(classes.map((item) => [item.id, item])), [classes]);
  const teacherById = useMemo(() => new Map(teachers.map((item) => [item.id, item])), [teachers]);
  const subjectById = useMemo(() => new Map(subjects.map((item) => [item.id, item])), [subjects]);
  const classroomById = useMemo(() => new Map(classrooms.map((item) => [item.id, item])), [classrooms]);

  const subjectNameById = useMemo(() => {
    const map = new Map<number, string>();
    subjects.forEach((subject) => map.set(subject.id, subject.name));
    return map;
  }, [subjects]);

  const teacherShortNameById = useMemo(() => {
    const map = new Map<number, string>();
    teachers.forEach((teacher) => {
      map.set(
        teacher.id,
        `${teacher.surname} ${teacher.name[0]}.${teacher.patronymic ? teacher.patronymic[0] + "." : ""}`,
      );
    });
    return map;
  }, [teachers]);

  const classroomNumberById = useMemo(() => {
    const map = new Map<number, string>();
    classrooms.forEach((classroom) => map.set(classroom.id, classroom.number));
    return map;
  }, [classrooms]);

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
      const teacherIds = entry.teacherIds.length > 0 ? entry.teacherIds : entry.teacherId ? [entry.teacherId] : [];
      teacherIds.forEach((teacherId) => {
        const key = `${teacherId}:${entry.day}:${entry.lessonNumber}`;
        map.set(key, (map.get(key) || 0) + 1);
      });
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

  const updateScheduleEntryInState = useCallback((entry: ScheduleEntry) => {
    setSchedule((previous) => {
      const filtered = previous.filter((item) => {
        if (item.id === entry.id) return false;
        return !(item.classId === entry.classId && item.day === entry.day && item.lessonNumber === entry.lessonNumber);
      });
      return [...filtered, entry];
    });
  }, []);

  const getTeacherBusyCount = useCallback(
    (teacherId: number, cell: { day: number; lessonNumber: number }, excludeEntryId?: number) => {
      const key = `${teacherId}:${cell.day}:${cell.lessonNumber}`;
      const total = teacherOccupancy.get(key) || 0;
      if (!excludeEntryId) return total;
      const edited = scheduleById.get(excludeEntryId);
      const shouldExclude =
        edited &&
        (edited.teacherIds.includes(teacherId) || edited.teacherId === teacherId) &&
        edited.day === cell.day &&
        edited.lessonNumber === cell.lessonNumber;
      return shouldExclude ? Math.max(0, total - 1) : total;
    },
    [scheduleById, teacherOccupancy],
  );

  const getClassroomBusyCount = useCallback(
    (classroomId: number, cell: { day: number; lessonNumber: number }, excludeEntryId?: number) => {
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
    },
    [classroomOccupancy, scheduleById],
  );

  const handleDeleteFromCell = useCallback(
    async (entry: ScheduleEntry) => {
      await deleteScheduleMutation.mutateAsync({ scheduleId: entry.id });
      setSchedule((previous) => previous.filter((item) => item.id !== entry.id));
    },
    [deleteScheduleMutation],
  );

  const handleDeleteFromCellSafely = useCallback(
    (entry: ScheduleEntry) => {
      handleDeleteFromCell(entry).catch((error: any) => {
        alert(error.message || "Не удалось удалить запись");
      });
    },
    [handleDeleteFromCell],
  );

  const listManagement = useConstructorListManagement({
    selectedListId,
    selectedList,
    setSelectedListId,
    setSchedule,
  });

  const lessonEditor = useConstructorLessonEditor({
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
    upsertCell: upsertScheduleMutation.mutateAsync,
    updateScheduleEntryInState,
  });

  const dnd = useConstructorDnd({
    selectedListId,
    scheduleById,
    scheduleByCell,
    subjectById,
    teacherById,
    classroomById,
    upsertCell: upsertScheduleMutation.mutateAsync,
    deleteCell: (scheduleId: number) => deleteScheduleMutation.mutateAsync({ scheduleId }),
    setSchedule,
  });

  const saving = upsertScheduleMutation.isPending || deleteScheduleMutation.isPending || listManagement.listMutationsSaving;

  return {
    loading,
    saving,
    lists,
    classes,
    selectedList,
    selectedListId,
    setSelectedListId,
    isShiftPressed: dnd.isShiftPressed,
    handleActivateList: listManagement.handleActivateList,
    openCreateListModal: listManagement.openCreateListModal,
    openRenameListModal: listManagement.openRenameListModal,
    openDuplicateListModal: listManagement.openDuplicateListModal,
    handleDeleteList: listManagement.handleDeleteList,
    listModalMode: listManagement.listModalMode,
    closeListModal: listManagement.closeListModal,
    listModalName: listManagement.listModalName,
    setListModalName: listManagement.setListModalName,
    listModalError: listManagement.listModalError,
    handleListModalSubmit: listManagement.handleListModalSubmit,
    listModalTitle: listManagement.listModalTitle,
    listModalSubmitLabel: listManagement.listModalSubmitLabel,
    isListModalSubmitting: listManagement.isListModalSubmitting,
    activeCell: lessonEditor.activeCell,
    resetAddLessonModal: lessonEditor.resetAddLessonModal,
    lessonModalTitle: lessonEditor.lessonModalTitle,
    addLessonError: lessonEditor.addLessonError,
    addLessonForm: lessonEditor.addLessonForm,
    subjectOptions: lessonEditor.subjectOptions,
    teacherOptions: lessonEditor.teacherOptions,
    classroomOptions: lessonEditor.classroomOptions,
    isSubmittingLesson: lessonEditor.isSubmittingLesson,
    activeCellTeacherBusy: lessonEditor.activeCellTeacherBusy,
    isEditing: lessonEditor.isEditing,
    autocompleteLoading: lessonEditor.autocompleteLoading,
    teacherSuggestions: lessonEditor.teacherSuggestions,
    subjectSuggestions: lessonEditor.subjectSuggestions,
    classroomSuggestions: lessonEditor.classroomSuggestions,
    handleCreateLesson: lessonEditor.handleCreateLesson,
    onSubjectChange: lessonEditor.onSubjectChange,
    onToggleTeacher: lessonEditor.onToggleTeacher,
    onToggleClassroom: lessonEditor.onToggleClassroom,
    onApplyTeacherSuggestion: lessonEditor.onApplyTeacherSuggestion,
    onApplyClassroomSuggestion: lessonEditor.onApplyClassroomSuggestion,
    openAddLessonModal: lessonEditor.openAddLessonModal,
    openEditLessonModal: lessonEditor.openEditLessonModal,
    handleDeleteFromCellSafely,
    scheduleByCell,
    subjectNameById,
    teacherShortNameById,
    classroomNumberById,
    getTeacherBusyCount,
    activeDragEntry: dnd.activeDragEntry,
    dragOverlaySize: dnd.dragOverlaySize,
    handleDragStart: dnd.handleDragStart,
    handleDragEnd: dnd.handleDragEnd,
    handleDragCancel: dnd.handleDragCancel,
  };
}
