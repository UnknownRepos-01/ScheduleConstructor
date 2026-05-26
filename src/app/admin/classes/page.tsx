"use client";

import React, { useMemo, useState } from "react";

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
import type { ClassItem } from "@/lib/api/services/class.service";
import {
  useClassesQuery,
  useCreateClassMutation,
  useDeleteClassMutation,
  useGradesQuery,
  useUpdateClassMutation,
} from "@/lib/react-query";

export default function ClassesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ gradeId: "", letter: "" });
  const [error, setError] = useState<string | null>(null);
  const classesQuery = useClassesQuery();
  const gradesQuery = useGradesQuery();
  const createClassMutation = useCreateClassMutation();
  const updateClassMutation = useUpdateClassMutation();
  const deleteClassMutation = useDeleteClassMutation();
  const items = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const grades = useMemo(() => gradesQuery.data ?? [], [gradesQuery.data]);
  const loading = classesQuery.isLoading || gradesQuery.isLoading;
  const isSubmitting = createClassMutation.isPending || updateClassMutation.isPending;

  const resetForm = () => {
    setForm({ gradeId: "", letter: "" });
    setEditId(null);
    setShowForm(false);
    setError(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = { gradeId: Number.parseInt(form.gradeId, 10), letter: form.letter };
      if (editId) {
        await updateClassMutation.mutateAsync({ id: editId, payload });
      } else {
        await createClassMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить класс");
    }
  };

  const handleEdit = (item: ClassItem) => {
    setForm({ gradeId: String(item.gradeId), letter: item.letter });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот класс?")) return;
    try {
      await deleteClassMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Классы"
        subtitle="Управление классами и их привязкой к параллелям"
        actions={
          <Button
            variant="primary"
            onClick={openCreateForm}
          >
            <AppIcon name="add" className="h-4 w-4" />
            Добавить класс
          </Button>
        }
      />

      <Modal isOpen={showForm} onClose={resetForm} title={editId ? "Редактировать класс" : "Добавить класс"}>
        {error ? <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">{error}</div> : null}
        {grades.length === 0 ? (
          <div className="rounded-md border border-warning-border bg-warning-light px-3.5 py-2.5 text-[13px] font-medium text-warning">
            Сначала добавьте параллели на странице параллелей, чтобы затем создавать отдельные классы.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <FieldGroup>
                <FieldLabel>Параллель *</FieldLabel>
                <Select value={form.gradeId} onChange={(e) => setForm({ ...form, gradeId: e.target.value })} required>
                  <option value="">Выберите параллель...</option>
                  {grades
                    .sort((a, b) => a.number - b.number)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.number} класс
                      </option>
                    ))}
                </Select>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Буква класса *</FieldLabel>
                <Input
                  value={form.letter}
                  onChange={(e) => setForm({ ...form, letter: e.target.value.toUpperCase() })}
                  placeholder="Например, А, Б, В..."
                  required
                  maxLength={5}
                />
              </FieldGroup>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Сохранение..." : editId ? "Сохранить" : "Добавить"}
              </Button>
              <Button type="button" onClick={resetForm}>
                Отмена
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="classes"
            title="Классы пока не добавлены"
            actionLabel="Добавить класс"
            onAction={openCreateForm}
          />
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <THeadCell>ID</THeadCell>
                <THeadCell>Класс</THeadCell>
                <THeadCell>Параллель</THeadCell>
                <THeadCell>Буква</THeadCell>
                <THeadCell className="w-[140px]">Действия</THeadCell>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <TBodyCell>{item.id}</TBodyCell>
                  <TBodyCell className="text-base font-bold">{item.displayName}</TBodyCell>
                  <TBodyCell>{item.gradeNumber} класс</TBodyCell>
                  <TBodyCell>{item.letter}</TBodyCell>
                  <TBodyCell>
                    <TableRowActions onEdit={() => handleEdit(item)} onDelete={() => handleDelete(item.id)} />
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
