"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildClassroomNumberById,
  buildClassroomOccupancy,
  buildSubjectNameById,
  buildTeacherOccupancy,
  buildTeacherShortNameById,
  getEntryTeacherIds,
  getResourceBusyCount,
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
  useGenerateScheduleMutation,
} from "@/lib/react-query";

type IdEntity = { id: number };
type CellResourceMatcher = (entry: ScheduleEntry, resourceId: number) => boolean;

const toIdMap = <T extends IdEntity>(items: T[]): Map<number, T> => new Map(items.map((item) => [item.id, item]));

const showGenerationWarnings = (warnings?: string[]) => {
  if (!warnings || warnings.length === 0) return;
  alert(`Расписание сохранено, но есть компромиссы:\n${warnings.slice(0, 8).join("\n")}`);
};

function isEditedResourceInCell(
  scheduleById: Map<number, ScheduleEntry>,
  resourceId: number,
  cell: { day: number; lessonNumber: number },
  containsResource: CellResourceMatcher,
  excludeEntryId?: number,
): boolean {
  if (!excludeEntryId) return false;
  const editedEntry = scheduleById.get(excludeEntryId);

  return (
    !!editedEntry &&
    containsResource(editedEntry, resourceId) &&
    editedEntry.day === cell.day &&
    editedEntry.lessonNumber === cell.lessonNumber
  );
}

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
  const generateScheduleMutation = useGenerateScheduleMutation(selectedListId);

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
      const excludeCurrent = isEditedResourceInCell(
        scheduleById,
        teacherId,
        cell,
        (entry, resourceId) => getEntryTeacherIds(entry).includes(resourceId),
        excludeEntryId,
      );

      return getResourceBusyCount(
        teacherOccupancy,
        teacherId,
        cell,
        excludeCurrent,
      );
    },
    [scheduleById, teacherOccupancy],
  );

  const getClassroomBusyCount = useCallback(
    (classroomId: number, cell: { day: number; lessonNumber: number }, excludeEntryId?: number) => {
      const excludeCurrent = isEditedResourceInCell(
        scheduleById,
        classroomId,
        cell,
        (entry, resourceId) => entry.classroomIds.includes(resourceId),
        excludeEntryId,
      );

      return getResourceBusyCount(
        classroomOccupancy,
        classroomId,
        cell,
        excludeCurrent,
      );
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

  const handleGenerateSchedule = useCallback(async () => {
    if (!selectedListId) return;

    const replaceExisting =
      schedule.length > 0
        ? confirm("В текущем листе уже есть расписание. Заменить существующие уроки автоматически сгенерированными?")
        : false;
    if (schedule.length > 0 && !replaceExisting) return;

    try {
      const response = await generateScheduleMutation.mutateAsync({ listId: selectedListId, replaceExisting });
      setSchedule(normalizeScheduleEntries(response.entries));
    } catch (error: any) {
      alert(error.message || "Не удалось сгенерировать расписание");
    }
  }, [generateScheduleMutation, schedule.length, selectedListId]);

  const handleGenerateNewSchedule = useCallback(async () => {
    if (!selectedListId) return;

    if (
      schedule.length > 0 &&
      !confirm("В текущем листе уже есть расписание. Заменить существующие уроки автоматически сгенерированными?")
    ) {
      return;
    }

    try {
      const response = await generateScheduleMutation.mutateAsync({
        listId: selectedListId,
        replaceExisting: true,
        mode: "replace",
      });
      setSchedule(normalizeScheduleEntries(response.entries));
      showGenerationWarnings(response.warnings);
    } catch (error: any) {
      alert(error.message || "Не удалось сгенерировать расписание");
    }
  }, [generateScheduleMutation, schedule.length, selectedListId]);

  const handleAppendSchedule = useCallback(async () => {
    if (!selectedListId) return;

    try {
      const response = await generateScheduleMutation.mutateAsync({
        listId: selectedListId,
        append: true,
        mode: "append",
      });
      setSchedule(normalizeScheduleEntries(response.entries));
      showGenerationWarnings(response.warnings);
    } catch (error: any) {
      alert(error.message || "Не удалось дополнить расписание");
    }
  }, [generateScheduleMutation, selectedListId]);

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
    generateScheduleMutation.isPending ||
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
      handleGenerateNewSchedule,
      handleAppendSchedule,
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
