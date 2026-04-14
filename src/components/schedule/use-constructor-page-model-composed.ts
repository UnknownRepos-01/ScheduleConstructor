"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildClassroomNumberById,
  buildClassroomOccupancy,
  buildSubjectNameById,
  buildTeacherOccupancy,
  buildTeacherShortNameById,
  createResourceLoadKey,
  getEntryTeacherIds,
  normalizeScheduleEntries,
} from "@/components/schedule/constructor-entry-utils";
import { createCellKey } from "@/components/schedule/constructor-dnd-utils";
import { CONSTRUCTOR_TEXT } from "@/components/schedule/constructor-text";
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

type IdEntity = { id: number };

const toIdMap = <T extends IdEntity>(items: T[]): Map<number, T> => new Map(items.map((item) => [item.id, item]));

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
    if (selectedListId !== null || lists.length === 0) return;
    const activeList = lists.find((item) => item.isActive);
    setSelectedListId(activeList ? activeList.id : lists[0].id);
  }, [lists, selectedListId]);

  useEffect(() => {
    if (!scheduleQuery.data) {
      if (selectedListId === null) {
        setSchedule([]);
      }
      return;
    }

    setSchedule(normalizeScheduleEntries(scheduleQuery.data));
  }, [scheduleQuery.data, selectedListId]);

  const classById = useMemo(() => toIdMap(classes), [classes]);
  const teacherById = useMemo(() => toIdMap(teachers), [teachers]);
  const subjectById = useMemo(() => toIdMap(subjects), [subjects]);
  const classroomById = useMemo(() => toIdMap(classrooms), [classrooms]);

  const subjectNameById = useMemo(() => buildSubjectNameById(subjects), [subjects]);
  const teacherShortNameById = useMemo(() => buildTeacherShortNameById(teachers), [teachers]);
  const classroomNumberById = useMemo(() => buildClassroomNumberById(classrooms), [classrooms]);

  const scheduleById = useMemo(() => toIdMap(schedule), [schedule]);
  const scheduleByCell = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    schedule.forEach((entry) => {
      map.set(createCellKey(entry.classId, entry.day, entry.lessonNumber), entry);
    });
    return map;
  }, [schedule]);

  const teacherOccupancy = useMemo(() => buildTeacherOccupancy(schedule), [schedule]);
  const classroomOccupancy = useMemo(() => buildClassroomOccupancy(schedule), [schedule]);

  const selectedList = useMemo(
    () => lists.find((list) => list.id === selectedListId),
    [lists, selectedListId],
  );

  const updateScheduleEntryInState = useCallback((entry: ScheduleEntry) => {
    setSchedule((previous) => {
      const next = previous.filter(
        (item) =>
          item.id !== entry.id &&
          !(item.classId === entry.classId && item.day === entry.day && item.lessonNumber === entry.lessonNumber),
      );
      return [...next, entry];
    });
  }, []);

  const getTeacherBusyCount = useCallback(
    (teacherId: number, cell: { day: number; lessonNumber: number }, excludeEntryId?: number) => {
      const key = createResourceLoadKey(teacherId, cell.day, cell.lessonNumber);
      const total = teacherOccupancy.get(key) || 0;
      if (!excludeEntryId) return total;

      const editedEntry = scheduleById.get(excludeEntryId);
      const shouldExcludeCurrent =
        !!editedEntry &&
        getEntryTeacherIds(editedEntry).includes(teacherId) &&
        editedEntry.day === cell.day &&
        editedEntry.lessonNumber === cell.lessonNumber;

      return shouldExcludeCurrent ? Math.max(0, total - 1) : total;
    },
    [scheduleById, teacherOccupancy],
  );

  const getClassroomBusyCount = useCallback(
    (classroomId: number, cell: { day: number; lessonNumber: number }, excludeEntryId?: number) => {
      const key = createResourceLoadKey(classroomId, cell.day, cell.lessonNumber);
      const total = classroomOccupancy.get(key) || 0;
      if (!excludeEntryId) return total;

      const editedEntry = scheduleById.get(excludeEntryId);
      const shouldExcludeCurrent =
        !!editedEntry &&
        editedEntry.classroomIds.includes(classroomId) &&
        editedEntry.day === cell.day &&
        editedEntry.lessonNumber === cell.lessonNumber;

      return shouldExcludeCurrent ? Math.max(0, total - 1) : total;
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
        alert(error.message || CONSTRUCTOR_TEXT.scheduleDeleteError);
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

  const saving =
    upsertScheduleMutation.isPending ||
    deleteScheduleMutation.isPending ||
    listManagement.listMutationsSaving;

  return {
    status: {
      loading,
      saving,
    },
    selection: {
      lists,
      classes,
      selectedList,
      selectedListId,
      setSelectedListId,
      isShiftPressed: dnd.isShiftPressed,
    },
    listActions: {
      handleActivateList: listManagement.handleActivateList,
      openCreateListModal: listManagement.openCreateListModal,
      openRenameListModal: listManagement.openRenameListModal,
      openDuplicateListModal: listManagement.openDuplicateListModal,
      handleDeleteList: listManagement.handleDeleteList,
    },
    listModal: {
      isOpen: listManagement.listModalMode !== null,
      title: listManagement.listModalTitle,
      submitLabel: listManagement.listModalSubmitLabel,
      name: listManagement.listModalName,
      error: listManagement.listModalError,
      isSubmitting: listManagement.isListModalSubmitting,
      onNameChange: listManagement.setListModalName,
      onSubmit: listManagement.handleListModalSubmit,
      onClose: listManagement.closeListModal,
    },
    lessonModal: {
      isOpen: !!lessonEditor.activeCell,
      title: lessonEditor.lessonModalTitle,
      error: lessonEditor.addLessonError,
      form: lessonEditor.addLessonForm,
      subjects: lessonEditor.subjectOptions,
      teacherOptions: lessonEditor.teacherOptions,
      classroomOptions: lessonEditor.classroomOptions,
      isSubmitting: lessonEditor.isSubmittingLesson,
      isTeacherBusy: lessonEditor.activeCellTeacherBusy,
      isEditing: lessonEditor.isEditing,
      autocompleteLoading: lessonEditor.autocompleteLoading,
      teacherSuggestions: lessonEditor.teacherSuggestions,
      subjectSuggestions: lessonEditor.subjectSuggestions,
      classroomSuggestions: lessonEditor.classroomSuggestions,
      onSubmit: lessonEditor.handleCreateLesson,
      onSubjectChange: lessonEditor.onSubjectChange,
      onToggleTeacher: lessonEditor.onToggleTeacher,
      onToggleClassroom: lessonEditor.onToggleClassroom,
      onApplyTeacherSuggestion: lessonEditor.onApplyTeacherSuggestion,
      onApplyClassroomSuggestion: lessonEditor.onApplyClassroomSuggestion,
      onClose: lessonEditor.resetAddLessonModal,
    },
    grid: {
      classes,
      scheduleByCell,
      subjectNameById,
      teacherShortNameById,
      classroomNumberById,
      getTeacherBusyCount,
      onAddLesson: lessonEditor.openAddLessonModal,
      onEditLesson: lessonEditor.openEditLessonModal,
      onDeleteLesson: handleDeleteFromCellSafely,
      activeDragEntry: dnd.activeDragEntry,
      dragOverlaySize: dnd.dragOverlaySize,
      onDragStart: dnd.handleDragStart,
      onDragEnd: dnd.handleDragEnd,
      onDragCancel: dnd.handleDragCancel,
    },
  };
}
