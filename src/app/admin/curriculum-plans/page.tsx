"use client";

import React, { useState } from "react";

import { TableRowActions } from "@/components/admin/table-row-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldGroup, FieldLabel, Input, Select } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrapper, TBodyCell, THeadCell } from "@/components/ui/table";
import type { CurriculumPlan } from "@/lib/api/services/curriculum-plan.service";
import {
  useCreateCurriculumPlanMutation,
  useCurriculumPlansQuery,
  useDeleteCurriculumPlanMutation,
  useGradesQuery,
  useSubjectsQuery,
  useUpdateCurriculumPlanMutation,
} from "@/lib/react-query";

const EMPTY_FORM = { gradeId: "", subjectId: "", hoursPerWeek: "" };

export default function CurriculumPlansPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const plansQuery = useCurriculumPlansQuery();
  const gradesQuery = useGradesQuery();
  const subjectsQuery = useSubjectsQuery();
  const createMutation = useCreateCurriculumPlanMutation();
  const updateMutation = useUpdateCurriculumPlanMutation();
  const deleteMutation = useDeleteCurriculumPlanMutation();

  const isLoading = plansQuery.isLoading || gradesQuery.isLoading || subjectsQuery.isLoading;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const plans = plansQuery.data ?? [];

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
    setError(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (plan: CurriculumPlan) => {
    setForm({
      gradeId: String(plan.gradeId),
      subjectId: String(plan.subjectId),
      hoursPerWeek: String(plan.hoursPerWeek),
    });
    setEditId(plan.id);
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const payload = {
      gradeId: Number.parseInt(form.gradeId, 10),
      subjectId: Number.parseInt(form.subjectId, 10),
      hoursPerWeek: Number.parseInt(form.hoursPerWeek, 10),
    };

    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить учебный план");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить запись учебного плана?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err.message || "Не удалось удалить запись учебного плана");
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Учебный план"
        subtitle="Количество часов в неделю по предметам для каждой параллели"
        actions={
          <Button variant="primary" onClick={openCreateForm}>
            <AppIcon name="add" className="h-4 w-4" />
            Добавить часы
          </Button>
        }
      />

      <Modal isOpen={showForm} onClose={resetForm} title={editId ? "Редактировать часы" : "Добавить часы"}>
        {error ? (
          <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit}>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <FieldGroup>
              <FieldLabel>Параллель *</FieldLabel>
              <Select value={form.gradeId} onChange={(event) => setForm({ ...form, gradeId: event.target.value })} required>
                <option value="">Выберите...</option>
                {(gradesQuery.data ?? []).sort((a, b) => a.number - b.number).map((grade) => (
                  <option key={grade.id} value={grade.id}>{grade.number} класс</option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Предмет *</FieldLabel>
              <Select value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} required>
                <option value="">Выберите...</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Часов в неделю *</FieldLabel>
              <Input
                type="number"
                min="1"
                value={form.hoursPerWeek}
                onChange={(event) => setForm({ ...form, hoursPerWeek: event.target.value })}
                required
              />
            </FieldGroup>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Сохранение..." : "Сохранить"}
            </Button>
            <Button type="button" onClick={resetForm}>Отмена</Button>
          </div>
        </form>
      </Modal>

      {plans.length === 0 ? (
        <Card>
          <EmptyState icon="subjects" title="Учебный план пока не заполнен" />
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <THeadCell>Параллель</THeadCell>
                <THeadCell>Предмет</THeadCell>
                <THeadCell>Часов в неделю</THeadCell>
                <THeadCell className="w-[140px]">Действия</THeadCell>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <TBodyCell>{plan.gradeNumber} класс</TBodyCell>
                  <TBodyCell className="font-semibold">{plan.subjectName}</TBodyCell>
                  <TBodyCell>{plan.hoursPerWeek}</TBodyCell>
                  <TBodyCell>
                    <TableRowActions onEdit={() => openEdit(plan)} onDelete={() => handleDelete(plan.id)} />
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
