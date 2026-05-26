"use client";

import React, { useMemo, useState } from "react";

import { TableRowActions } from "@/components/admin/table-row-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldGroup, FieldLabel, Input } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrapper, TBodyCell, THeadCell } from "@/components/ui/table";
import type { Grade } from "@/lib/api/services/grade.service";
import {
  useCreateGradeMutation,
  useDeleteGradeMutation,
  useGradesQuery,
  useUpdateGradeMutation,
} from "@/lib/react-query";

export default function GradesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ number: "", hours: "" });
  const [error, setError] = useState<string | null>(null);
  const gradesQuery = useGradesQuery();
  const createGradeMutation = useCreateGradeMutation();
  const updateGradeMutation = useUpdateGradeMutation();
  const deleteGradeMutation = useDeleteGradeMutation();
  const items = useMemo(() => gradesQuery.data ?? [], [gradesQuery.data]);
  const loading = gradesQuery.isLoading;
  const isSubmitting = createGradeMutation.isPending || updateGradeMutation.isPending;

  const resetForm = () => {
    setForm({ number: "", hours: "" });
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
      const payload = { number: Number.parseInt(form.number, 10), hours: Number.parseInt(form.hours, 10) };
      if (editId) {
        await updateGradeMutation.mutateAsync({ id: editId, payload });
      } else {
        await createGradeMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить параллель");
    }
  };

  const handleEdit = (g: Grade) => {
    setForm({ number: String(g.number), hours: String(g.hours) });
    setEditId(g.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить эту параллель?")) return;
    try {
      await deleteGradeMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Параллели"
        subtitle="Управление учебными параллелями и количеством часов в неделю"
        actions={
          <Button
            variant="primary"
            onClick={openCreateForm}
          >
            <AppIcon name="add" className="h-4 w-4" />
            Добавить параллель
          </Button>
        }
      />

      <Modal isOpen={showForm} onClose={resetForm} title={editId ? "Редактировать параллель" : "Добавить параллель"}>
        {error ? (
          <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit}>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FieldGroup>
              <FieldLabel>Номер параллели *</FieldLabel>
              <Input type="number" min="1" max="11" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Количество учебных часов в неделю *</FieldLabel>
              <Input type="number" min="1" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} required />
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
      </Modal>

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="grades"
            title="Параллели пока не добавлены"
            actionLabel="Добавить параллель"
            onAction={openCreateForm}
          />
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <THeadCell>ID</THeadCell>
                <THeadCell>Параллель</THeadCell>
                <THeadCell>Часов в неделю</THeadCell>
                <THeadCell className="w-[140px]">Действия</THeadCell>
              </tr>
            </thead>
            <tbody>
              {items.sort((a, b) => a.number - b.number).map((g) => (
                <tr key={g.id}>
                  <TBodyCell>{g.id}</TBodyCell>
                  <TBodyCell className="font-semibold">{g.number} класс</TBodyCell>
                  <TBodyCell>{g.hours}</TBodyCell>
                  <TBodyCell>
                    <TableRowActions onEdit={() => handleEdit(g)} onDelete={() => handleDelete(g.id)} />
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
