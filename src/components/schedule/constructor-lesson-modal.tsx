"use client";

import { useEffect, useMemo, useState } from "react";

import type { AddLessonForm, Subject } from "@/components/schedule/constructor-types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

type TeacherOption = {
  id: number;
  label: string;
  isBusy: boolean;
};

type ClassroomOption = {
  id: number;
  number: string;
  isBusy: boolean;
};

type AutocompleteTeacherSuggestion = {
  teacherId: number;
  label: string;
};

type AutocompleteSubjectSuggestion = {
  subjectId: number;
  name: string;
};

type AutocompleteClassroomSuggestion = {
  classroomId: number;
  number: string;
};

type ConstructorLessonModalProps = {
  isOpen: boolean;
  title: string;
  error: string | null;
  form: AddLessonForm;
  subjects: Subject[];
  teacherOptions: TeacherOption[];
  classroomOptions: ClassroomOption[];
  isSubmitting: boolean;
  isTeacherBusy: boolean;
  isEditing: boolean;
  autocompleteLoading?: boolean;
  teacherSuggestions?: AutocompleteTeacherSuggestion[];
  subjectSuggestions?: AutocompleteSubjectSuggestion[];
  classroomSuggestions?: AutocompleteClassroomSuggestion[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onSubjectChange: (value: string) => void;
  onToggleTeacher: (teacherId: number) => void;
  onToggleClassroom: (classroomId: number) => void;
  onApplyTeacherSuggestion: (teacherId: number) => void;
  onApplyClassroomSuggestion: (classroomId: number) => void;
};

const getOptionButtonClassName = (selected: boolean, isBusy: boolean) => {
  if (selected) {
    return "rounded-md border border-accent-primary bg-accent-primary-light px-2 py-1 text-xs font-semibold text-accent-primary";
  }

  return isBusy
    ? "rounded-md border border-danger-border bg-danger-light px-2 py-1 text-xs text-danger"
    : "rounded-md border border-border-light px-2 py-1 text-xs text-text-secondary";
};

const suggestionButtonClassName =
  "rounded-md border border-border-light px-2 py-1 text-xs text-text-secondary hover:border-accent-primary hover:text-accent-primary";

export function ConstructorLessonModal({
  isOpen,
  title,
  error,
  form,
  subjects,
  teacherOptions,
  classroomOptions,
  isSubmitting,
  isTeacherBusy,
  isEditing,
  autocompleteLoading,
  teacherSuggestions = [],
  subjectSuggestions = [],
  classroomSuggestions = [],
  onClose,
  onSubmit,
  onSubjectChange,
  onToggleTeacher,
  onToggleClassroom,
  onApplyTeacherSuggestion,
  onApplyClassroomSuggestion,
}: ConstructorLessonModalProps) {
  const [teacherSearch, setTeacherSearch] = useState("");
  const [classroomSearch, setClassroomSearch] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTeacherSearch("");
      setClassroomSearch("");
    }
  }, [isOpen]);

  const selectedTeacherIds = useMemo(() => new Set(form.teacherIds), [form.teacherIds]);
  const selectedClassroomIds = useMemo(() => new Set(form.classroomIds), [form.classroomIds]);

  const normalizedTeacherSearch = teacherSearch.trim().toLocaleLowerCase("ru");
  const normalizedClassroomSearch = classroomSearch.trim().toLocaleLowerCase("ru");

  const filteredTeacherOptions = useMemo(
    () =>
      normalizedTeacherSearch
        ? teacherOptions.filter((teacher) => teacher.label.toLocaleLowerCase("ru").includes(normalizedTeacherSearch))
        : teacherOptions,
    [normalizedTeacherSearch, teacherOptions],
  );

  const filteredClassroomOptions = useMemo(
    () =>
      normalizedClassroomSearch
        ? classroomOptions.filter((classroom) => classroom.number.toLocaleLowerCase("ru").includes(normalizedClassroomSearch))
        : classroomOptions,
    [classroomOptions, normalizedClassroomSearch],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-lg">
      {error ? (
        <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit}>
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Select value={form.subjectId} onChange={(event) => onSubjectChange(event.target.value)}>
            <option value="">Выберите предмет</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </Select>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-text-tertiary">
            <span>Преподаватели</span>
            <span className="text-[11px] normal-case tracking-normal text-text-tertiary">
              Выбрано: {form.teacherIds.length} / {teacherOptions.length}
            </span>
          </div>
          <div className="mb-2">
            <Input
              value={teacherSearch}
              onChange={(event) => setTeacherSearch(event.target.value)}
              placeholder="Поиск преподавателя..."
              className="py-2 text-xs"
            />
          </div>
          <div className="flex max-h-[140px] flex-wrap gap-1.5 overflow-auto rounded-md border border-border bg-bg-secondary p-2">
            {filteredTeacherOptions.map((teacher) => {
              const selected = selectedTeacherIds.has(teacher.id);
              return (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => onToggleTeacher(teacher.id)}
                  className={getOptionButtonClassName(selected, teacher.isBusy)}
                  title={teacher.isBusy ? "У преподавателя уже есть занятие в это время" : undefined}
                >
                  {teacher.label}
                </button>
              );
            })}
            {filteredTeacherOptions.length === 0 ? (
              <div className="px-1 py-0.5 text-xs text-text-tertiary">Ничего не найдено.</div>
            ) : null}
          </div>
        </div>

        {isTeacherBusy ? (
          <div className="mb-3 inline-flex items-center gap-1 rounded-md border border-warning-border bg-warning-light px-2.5 py-1 text-xs text-warning">
            <AppIcon name="warning" className="h-3 w-3" />
            У преподавателя уже есть занятие в это время.
          </div>
        ) : null}

        <div className="mb-3 rounded-md border border-border bg-bg-secondary p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-text-tertiary">Подсказки</div>
          {autocompleteLoading ? (
            <div className="text-xs text-text-tertiary">Анализ прошлых расписаний...</div>
          ) : (
            <div className="space-y-2">
              {teacherSuggestions.length > 0 ? (
                <div>
                  <div className="mb-1 text-xs text-text-secondary">Рекомендуемые преподаватели</div>
                  <div className="flex flex-wrap gap-1.5">
                    {teacherSuggestions.slice(0, 5).map((suggestion) => (
                      <button
                        key={suggestion.teacherId}
                        type="button"
                        onClick={() => onApplyTeacherSuggestion(suggestion.teacherId)}
                        className={suggestionButtonClassName}
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {subjectSuggestions.length > 0 ? (
                <div>
                  <div className="mb-1 text-xs text-text-secondary">Рекомендуемые предметы</div>
                  <div className="flex flex-wrap gap-1.5">
                    {subjectSuggestions.slice(0, 5).map((suggestion) => (
                      <button
                        key={suggestion.subjectId}
                        type="button"
                        onClick={() => onSubjectChange(String(suggestion.subjectId))}
                        className={suggestionButtonClassName}
                      >
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {classroomSuggestions.length > 0 ? (
                <div>
                  <div className="mb-1 text-xs text-text-secondary">Рекомендуемые кабинеты</div>
                  <div className="flex flex-wrap gap-1.5">
                    {classroomSuggestions.slice(0, 6).map((suggestion) => (
                      <button
                        key={suggestion.classroomId}
                        type="button"
                        onClick={() => onApplyClassroomSuggestion(suggestion.classroomId)}
                        className={suggestionButtonClassName}
                      >
                        {suggestion.number}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {teacherSuggestions.length === 0 && subjectSuggestions.length === 0 && classroomSuggestions.length === 0 ? (
                <div className="text-xs text-text-tertiary">Недостаточно исторических данных для подсказок.</div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-text-tertiary">
            <span>Кабинеты</span>
            <span className="text-[11px] normal-case tracking-normal text-text-tertiary">
              Выбрано: {form.classroomIds.length} / {classroomOptions.length}
            </span>
          </div>
          <div className="mb-2">
            <Input
              value={classroomSearch}
              onChange={(event) => setClassroomSearch(event.target.value)}
              placeholder="Поиск кабинета..."
              className="py-2 text-xs"
            />
          </div>
          <div className="flex max-h-[140px] flex-wrap gap-1.5 overflow-auto rounded-md border border-border bg-bg-secondary p-2">
            {filteredClassroomOptions.map((classroom) => {
              const selected = selectedClassroomIds.has(classroom.id);

              return (
                <button
                  key={classroom.id}
                  type="button"
                  onClick={() => onToggleClassroom(classroom.id)}
                  className={getOptionButtonClassName(selected, classroom.isBusy)}
                  title={classroom.isBusy ? "Кабинет уже занят в это время" : undefined}
                >
                  {classroom.number}
                </button>
              );
            })}
            {filteredClassroomOptions.length === 0 ? (
              <div className="px-1 py-0.5 text-xs text-text-tertiary">Ничего не найдено.</div>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Сохранение..." : isEditing ? "Сохранить" : "Добавить"}
          </Button>
          <Button type="button" onClick={onClose}>Отмена</Button>
        </div>
      </form>
    </Modal>
  );
}
