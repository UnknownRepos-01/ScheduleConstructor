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
import type { Subject } from "@/lib/api/services/subject.service";
import {
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
  useSubjectsQuery,
  useUpdateSubjectMutation,
} from "@/lib/react-query";

export default function SubjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "" });
  const [error, setError] = useState<string | null>(null);
  const subjectsQuery = useSubjectsQuery();
  const createSubjectMutation = useCreateSubjectMutation();
  const updateSubjectMutation = useUpdateSubjectMutation();
  const deleteSubjectMutation = useDeleteSubjectMutation();
  const items = useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data]);
  const loading = subjectsQuery.isLoading;
  const isSubmitting = createSubjectMutation.isPending || updateSubjectMutation.isPending;

  const resetForm = () => {
    setForm({ name: "" });
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
      const payload = { name: form.name };
      if (editId) {
        await updateSubjectMutation.mutateAsync({ id: editId, payload });
      } else {
        await createSubjectMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить предмет");
    }
  };

  const handleEdit = (item: Subject) => {
    setForm({ name: item.name });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот предмет?")) return;
    try {
      await deleteSubjectMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Предметы"
        subtitle="Управление школьными предметами, которые используются в расписании"
        actions={
          <Button variant="primary" onClick={openCreateForm}>
            <AppIcon name="add" className="h-4 w-4" />
            Добавить предмет
          </Button>
        }
      />

      <Modal isOpen={showForm} onClose={resetForm} title={editId ? "Редактировать предмет" : "Добавить предмет"}>
        {error ? <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">{error}</div> : null}
        <form onSubmit={handleSubmit}>
          <FieldGroup className="mb-4 max-w-[400px]">
            <FieldLabel>Название предмета *</FieldLabel>
            <Input value={form.name} onChange={(e) => setForm({ name: e.target.value })} placeholder="Например, Математика, Русский язык, История..." required />
          </FieldGroup>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Сохранение..." : editId ? "Сохранить" : "Добавить"}
            </Button>
            <Button type="button" onClick={resetForm}>Отмена</Button>
          </div>
        </form>
      </Modal>

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="subjects"
            title="Предметы пока не добавлены"
            actionLabel="Добавить предмет"
            onAction={openCreateForm}
          />
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <THeadCell>ID</THeadCell>
                <THeadCell>Название предмета</THeadCell>
                <THeadCell className="w-[140px]">Действия</THeadCell>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <TBodyCell>{item.id}</TBodyCell>
                  <TBodyCell className="font-semibold">{item.name}</TBodyCell>
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
