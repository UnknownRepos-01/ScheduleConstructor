"use client";

import React, { useMemo, useState } from "react";

import { TableRowActions } from "@/components/admin/table-row-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldGroup, FieldLabel, Select } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrapper, TBodyCell, THeadCell } from "@/components/ui/table";
import type {
  AutoAssignTeachingAssignmentsResponse,
  TeachingAssignment,
} from "@/lib/api/services/teaching-assignment.service";
import {
  useAutoAssignTeachingAssignmentsMutation,
  useClassesQuery,
  useCreateTeachingAssignmentMutation,
  useDeleteTeachingAssignmentMutation,
  useSubjectsQuery,
  useTeachersQuery,
  useTeachingAssignmentsQuery,
  useUpdateTeachingAssignmentMutation,
} from "@/lib/react-query";

const EMPTY_FORM = { classId: "", subjectId: "", teacherId: "" };

const reportPreview = (items: AutoAssignTeachingAssignmentsResponse["created"], withTeacher = false) =>
  items.slice(0, 8).map((item) => (
    <li key={`${item.classId}:${item.subjectId}:${item.teacherId ?? "none"}`}>
      {item.className}, {item.subjectName}
      {withTeacher && item.teacherName ? ` - ${item.teacherName}` : ""}
    </li>
  ));

export default function TeachingAssignmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [autoAssignReport, setAutoAssignReport] = useState<AutoAssignTeachingAssignmentsResponse | null>(null);

  const assignmentsQuery = useTeachingAssignmentsQuery();
  const classesQuery = useClassesQuery();
  const subjectsQuery = useSubjectsQuery();
  const teachersQuery = useTeachersQuery();
  const createMutation = useCreateTeachingAssignmentMutation();
  const updateMutation = useUpdateTeachingAssignmentMutation();
  const deleteMutation = useDeleteTeachingAssignmentMutation();
  const autoAssignMutation = useAutoAssignTeachingAssignmentsMutation();

  const assignments = assignmentsQuery.data ?? [];
  const subjectId = form.subjectId ? Number.parseInt(form.subjectId, 10) : null;
  const teacherOptions = useMemo(
    () =>
      (teachersQuery.data ?? []).filter(
        (teacher) => subjectId !== null && (teacher.subjectIds ?? []).includes(subjectId),
      ),
    [subjectId, teachersQuery.data],
  );

  const isLoading = assignmentsQuery.isLoading || classesQuery.isLoading || subjectsQuery.isLoading || teachersQuery.isLoading;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
    setError(null);
  };

  const openEdit = (assignment: TeachingAssignment) => {
    setForm({
      classId: String(assignment.classId),
      subjectId: String(assignment.subjectId),
      teacherId: String(assignment.teacherId),
    });
    setEditId(assignment.id);
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = {
      classId: Number.parseInt(form.classId, 10),
      subjectId: Number.parseInt(form.subjectId, 10),
      teacherId: Number.parseInt(form.teacherId, 10),
    };

    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить назначение");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить назначение преподавателя?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err.message || "Не удалось удалить назначение");
    }
  };

  const handleAutoAssign = async () => {
    setAutoAssignReport(null);
    try {
      const report = await autoAssignMutation.mutateAsync();
      setAutoAssignReport(report);
    } catch (err: any) {
      alert(err.message || "Не удалось автоматически назначить преподавателей");
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Назначения преподавателей"
        subtitle="Преподаватель для конкретного класса и предмета"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="success" onClick={handleAutoAssign} disabled={autoAssignMutation.isPending}>
              <AppIcon name="teachers" className="h-4 w-4" />
              {autoAssignMutation.isPending ? "Назначение..." : "Автоматически назначить преподавателей"}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <AppIcon name="add" className="h-4 w-4" />
              Добавить назначение
            </Button>
          </div>
        }
      />

      {autoAssignReport ? (
        <Card className="mb-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-text-primary">{autoAssignReport.message}</div>
              <div className="text-sm text-text-secondary">
                Создано: {autoAssignReport.createdCount}. Уже было: {autoAssignReport.existingCount}. Не назначено:{" "}
                {autoAssignReport.failedCount}.
              </div>
            </div>
            <Button size="sm" onClick={() => setAutoAssignReport(null)}>
              Закрыть
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <div className="mb-1 font-semibold text-text-primary">Созданные</div>
              {autoAssignReport.created.length > 0 ? (
                <ul className="list-disc pl-5 text-text-secondary">{reportPreview(autoAssignReport.created, true)}</ul>
              ) : (
                <div className="text-text-tertiary">Нет новых назначений</div>
              )}
            </div>
            <div>
              <div className="mb-1 font-semibold text-text-primary">Уже существовали</div>
              {autoAssignReport.existing.length > 0 ? (
                <ul className="list-disc pl-5 text-text-secondary">{reportPreview(autoAssignReport.existing)}</ul>
              ) : (
                <div className="text-text-tertiary">Нет существовавших назначений</div>
              )}
            </div>
            <div>
              <div className="mb-1 font-semibold text-text-primary">Не удалось назначить</div>
              {autoAssignReport.failed.length > 0 ? (
                <ul className="list-disc pl-5 text-danger">{reportPreview(autoAssignReport.failed)}</ul>
              ) : (
                <div className="text-text-tertiary">Ошибок нет</div>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      <Modal isOpen={showForm} onClose={resetForm} title={editId ? "Редактировать назначение" : "Добавить назначение"}>
        {error ? (
          <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit}>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <FieldGroup>
              <FieldLabel>Класс *</FieldLabel>
              <Select value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })} required>
                <option value="">Выберите...</option>
                {(classesQuery.data ?? []).map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.displayName}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Предмет *</FieldLabel>
              <Select
                value={form.subjectId}
                onChange={(event) => setForm({ ...form, subjectId: event.target.value, teacherId: "" })}
                required
              >
                <option value="">Выберите...</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Преподаватель *</FieldLabel>
              <Select
                value={form.teacherId}
                onChange={(event) => setForm({ ...form, teacherId: event.target.value })}
                required
                disabled={!form.subjectId}
              >
                <option value="">Выберите...</option>
                {teacherOptions.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.surname} {teacher.name} {teacher.patronymic ?? ""}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          {form.subjectId && teacherOptions.length === 0 ? (
            <div className="mb-4 rounded-md border border-warning-border bg-warning-light px-3.5 py-2.5 text-[13px] font-medium text-warning">
              Нет преподавателей, которые ведут выбранный предмет.
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Сохранение..." : "Сохранить"}
            </Button>
            <Button type="button" onClick={resetForm}>
              Отмена
            </Button>
          </div>
        </form>
      </Modal>

      {assignments.length === 0 ? (
        <Card>
          <EmptyState icon="teachers" title="Назначения пока не добавлены" />
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <THeadCell>Класс</THeadCell>
                <THeadCell>Предмет</THeadCell>
                <THeadCell>Преподаватель</THeadCell>
                <THeadCell className="w-[140px]">Действия</THeadCell>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <TBodyCell className="font-semibold">{assignment.className}</TBodyCell>
                  <TBodyCell>{assignment.subjectName}</TBodyCell>
                  <TBodyCell>{assignment.teacherName}</TBodyCell>
                  <TBodyCell>
                    <TableRowActions onEdit={() => openEdit(assignment)} onDelete={() => handleDelete(assignment.id)} />
                  </TBodyCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
    </div>
  );
}
