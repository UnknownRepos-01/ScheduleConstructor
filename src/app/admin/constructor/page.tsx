"use client";

import { ConstructorGrid } from "@/components/schedule/constructor-grid";
import { ConstructorLessonModal } from "@/components/schedule/constructor-lesson-modal";
import { ConstructorListModal } from "@/components/schedule/constructor-list-modal";
import { CONSTRUCTOR_TEXT } from "@/components/schedule/constructor-text";
import { ConstructorToolbar } from "@/components/schedule/constructor-toolbar";
import { useConstructorPageModel } from "@/components/schedule/use-constructor-page-model-composed";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";

function buildSubtitle(
  saving: boolean,
  selectedList: { name: string; isActive: boolean } | undefined,
) {
  if (saving) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <AppIcon name="saving" className="h-4 w-4" />
        {CONSTRUCTOR_TEXT.saving}
      </span>
    );
  }

  if (!selectedList) return undefined;

  return `${CONSTRUCTOR_TEXT.listLabel}: ${selectedList.name}${
    selectedList.isActive ? ` (${CONSTRUCTOR_TEXT.listActiveLabel})` : ""
  }`;
}

export default function ConstructorPage() {
  const model = useConstructorPageModel();
  const subtitle = buildSubtitle(model.status.saving, model.selection.selectedList);

  if (model.status.loading) {
    return <LoadingState />;
  }

  return (
    <div className="h-[calc(100dvh-74px)] flex flex-col overflow-hidden">
      <PageHeader title={CONSTRUCTOR_TEXT.pageTitle} subtitle={subtitle} />

      <ConstructorToolbar
        lists={model.selection.lists}
        selectedListId={model.selection.selectedListId}
        selectedListIsActive={!!model.selection.selectedList?.isActive}
        isShiftPressed={model.selection.isShiftPressed}
        onSelectList={model.selection.setSelectedListId}
        onActivateList={model.listActions.handleActivateList}
        onCreateList={model.listActions.openCreateListModal}
        onRenameList={model.listActions.openRenameListModal}
        onDuplicateList={model.listActions.openDuplicateListModal}
        onDeleteList={model.listActions.handleDeleteList}
      />

      <ConstructorListModal
        isOpen={model.listModal.isOpen}
        onClose={model.listModal.onClose}
        name={model.listModal.name}
        error={model.listModal.error}
        isSubmitting={model.listModal.isSubmitting}
        onNameChange={model.listModal.onNameChange}
        onSubmit={model.listModal.onSubmit}
        title={model.listModal.title}
        submitLabel={model.listModal.submitLabel}
      />

      <ConstructorLessonModal
        isOpen={model.lessonModal.isOpen}
        onClose={model.lessonModal.onClose}
        title={model.lessonModal.title}
        error={model.lessonModal.error}
        form={model.lessonModal.form}
        subjects={model.lessonModal.subjects}
        teacherOptions={model.lessonModal.teacherOptions}
        classroomOptions={model.lessonModal.classroomOptions}
        isSubmitting={model.lessonModal.isSubmitting}
        isTeacherBusy={model.lessonModal.isTeacherBusy}
        isEditing={model.lessonModal.isEditing}
        autocompleteLoading={model.lessonModal.autocompleteLoading}
        teacherSuggestions={model.lessonModal.teacherSuggestions}
        subjectSuggestions={model.lessonModal.subjectSuggestions}
        classroomSuggestions={model.lessonModal.classroomSuggestions}
        onSubmit={model.lessonModal.onSubmit}
        onSubjectChange={model.lessonModal.onSubjectChange}
        onToggleTeacher={model.lessonModal.onToggleTeacher}
        onToggleClassroom={model.lessonModal.onToggleClassroom}
        onApplyTeacherSuggestion={model.lessonModal.onApplyTeacherSuggestion}
        onApplyClassroomSuggestion={model.lessonModal.onApplyClassroomSuggestion}
      />

      {!model.selection.selectedListId ? (
        <Card>
          <EmptyState icon="schedule" title={CONSTRUCTOR_TEXT.emptySelectList} />
        </Card>
      ) : model.selection.classes.length === 0 ? (
        <Card>
          <EmptyState icon="classes" title={CONSTRUCTOR_TEXT.emptyAddClasses} />
        </Card>
      ) : (
        <ConstructorGrid
          classes={model.grid.classes}
          saving={model.status.saving}
          scheduleByCell={model.grid.scheduleByCell}
          subjectNameById={model.grid.subjectNameById}
          teacherShortNameById={model.grid.teacherShortNameById}
          classroomNumberById={model.grid.classroomNumberById}
          getTeacherBusyCount={model.grid.getTeacherBusyCount}
          onAddLesson={model.grid.onAddLesson}
          onEditLesson={model.grid.onEditLesson}
          onDeleteLesson={model.grid.onDeleteLesson}
          activeDragEntry={model.grid.activeDragEntry}
          dragOverlaySize={model.grid.dragOverlaySize}
          onDragStart={model.grid.onDragStart}
          onDragEnd={model.grid.onDragEnd}
          onDragCancel={model.grid.onDragCancel}
        />
      )}
    </div>
  );
}

