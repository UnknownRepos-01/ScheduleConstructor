"use client";

import { ConstructorGrid } from "@/components/schedule/constructor-grid";
import { ConstructorLessonModal } from "@/components/schedule/constructor-lesson-modal";
import { ConstructorListModal } from "@/components/schedule/constructor-list-modal";
import { ConstructorToolbar } from "@/components/schedule/constructor-toolbar";
import { useConstructorPageModel } from "@/components/schedule/use-constructor-page-model-composed";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";

export default function ConstructorPageContainer() {
  const model = useConstructorPageModel();

  if (model.loading) {
    return <LoadingState />;
  }

  return (
    <div>
      <PageHeader
        title="Конструктор расписания"
        subtitle={
          model.saving ? (
            <span className="inline-flex items-center gap-1.5">
              <AppIcon name="saving" className="h-4 w-4" />
              Сохранение...
            </span>
          ) : model.selectedList ? (
            `Лист: ${model.selectedList.name}${model.selectedList.isActive ? " (активный)" : ""}`
          ) : undefined
        }
      />

      <ConstructorToolbar
        lists={model.lists}
        selectedListId={model.selectedListId}
        selectedListIsActive={!!model.selectedList?.isActive}
        isShiftPressed={model.isShiftPressed}
        onSelectList={model.setSelectedListId}
        onActivateList={model.handleActivateList}
        onCreateList={model.openCreateListModal}
        onRenameList={model.openRenameListModal}
        onDuplicateList={model.openDuplicateListModal}
        onDeleteList={model.handleDeleteList}
      />

      <ConstructorListModal
        isOpen={model.listModalMode !== null}
        onClose={model.closeListModal}
        name={model.listModalName}
        error={model.listModalError}
        isSubmitting={model.isListModalSubmitting}
        onNameChange={model.setListModalName}
        onSubmit={model.handleListModalSubmit}
        title={model.listModalTitle}
        submitLabel={model.listModalSubmitLabel}
      />

      <ConstructorLessonModal
        isOpen={!!model.activeCell}
        onClose={model.resetAddLessonModal}
        title={model.lessonModalTitle}
        error={model.addLessonError}
        form={model.addLessonForm}
        subjects={model.subjectOptions}
        teacherOptions={model.teacherOptions}
        classroomOptions={model.classroomOptions}
        isSubmitting={model.isSubmittingLesson}
        isTeacherBusy={model.activeCellTeacherBusy}
        isEditing={model.isEditing}
        autocompleteLoading={model.autocompleteLoading}
        teacherSuggestions={model.teacherSuggestions}
        subjectSuggestions={model.subjectSuggestions}
        classroomSuggestions={model.classroomSuggestions}
        onSubmit={model.handleCreateLesson}
        onSubjectChange={model.onSubjectChange}
        onToggleTeacher={model.onToggleTeacher}
        onToggleClassroom={model.onToggleClassroom}
        onApplyTeacherSuggestion={model.onApplyTeacherSuggestion}
        onApplyClassroomSuggestion={model.onApplyClassroomSuggestion}
      />

      {!model.selectedListId ? (
        <Card>
          <EmptyState icon="schedule" title="Выберите или создайте лист расписания" />
        </Card>
      ) : model.classes.length === 0 ? (
        <Card>
          <EmptyState icon="classes" title="Сначала добавьте классы в разделе «Классы»" />
        </Card>
      ) : (
        <ConstructorGrid
          classes={model.classes}
          saving={model.saving}
          scheduleByCell={model.scheduleByCell}
          subjectNameById={model.subjectNameById}
          teacherShortNameById={model.teacherShortNameById}
          classroomNumberById={model.classroomNumberById}
          getTeacherBusyCount={model.getTeacherBusyCount}
          onAddLesson={model.openAddLessonModal}
          onEditLesson={model.openEditLessonModal}
          onDeleteLesson={model.handleDeleteFromCellSafely}
          activeDragEntry={model.activeDragEntry}
          dragOverlaySize={model.dragOverlaySize}
          onDragStart={model.handleDragStart}
          onDragEnd={model.handleDragEnd}
          onDragCancel={model.handleDragCancel}
        />
      )}
    </div>
  );
}
