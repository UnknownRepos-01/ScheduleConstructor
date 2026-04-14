"use client";

import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldGroup, FieldLabel, Input } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrapper, TBodyCell, THeadCell } from "@/components/ui/table";
import type { Classroom } from "@/lib/api/services/classroom.service";
import {
  useClassroomsQuery,
  useCreateClassroomMutation,
  useDeleteClassroomMutation,
  useUpdateClassroomMutation,
} from "@/lib/react-query";

export default function ClassroomsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ number: "" });
  const [error, setError] = useState<string | null>(null);
  const classroomsQuery = useClassroomsQuery();
  const createClassroomMutation = useCreateClassroomMutation();
  const updateClassroomMutation = useUpdateClassroomMutation();
  const deleteClassroomMutation = useDeleteClassroomMutation();
  const items = useMemo(() => classroomsQuery.data ?? [], [classroomsQuery.data]);
  const loading = classroomsQuery.isLoading;
  const isSubmitting = createClassroomMutation.isPending || updateClassroomMutation.isPending;

  const resetForm = () => {
    setForm({ number: "" });
    setEditId(null);
    setShowForm(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = { number: form.number };
      if (editId) {
        await updateClassroomMutation.mutateAsync({ id: editId, payload });
      } else {
        await createClassroomMutation.mutateAsync(payload);
      }
      resetForm();
    } catch (err: any) {
      setError(err.message || "Не удалось сохранить кабинет");
    }
  };

  const handleEdit = (item: Classroom) => {
    setForm({ number: item.number });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот кабинет?")) return;
    try {
      await deleteClassroomMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Кабинеты"
        subtitle="Управление кабинетами, доступными для составления расписания"
        actions={
          <Button variant="primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <AppIcon name="add" className="h-4 w-4" />
            Добавить кабинет
          </Button>
        }
      />

      <Modal isOpen={showForm} onClose={resetForm} title={editId ? "Редактировать кабинет" : "Добавить кабинет"}>
        {error ? <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">{error}</div> : null}
        <form onSubmit={handleSubmit}>
          <FieldGroup className="mb-4 max-w-[300px]">
            <FieldLabel>Номер кабинета *</FieldLabel>
            <Input value={form.number} onChange={(e) => setForm({ number: e.target.value })} placeholder="101, 202, спортзал..." required />
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
            icon="classrooms"
            title="Кабинеты пока не добавлены"
            actionLabel="Добавить кабинет"
            onAction={() => { resetForm(); setShowForm(true); }}
          />
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <THeadCell>ID</THeadCell>
                <THeadCell>Номер кабинета</THeadCell>
                <THeadCell className="w-[140px]">Действия</THeadCell>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <TBodyCell>{item.id}</TBodyCell>
                  <TBodyCell className="font-semibold">{item.number}</TBodyCell>
                  <TBodyCell>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => handleEdit(item)}><AppIcon name="edit" className="h-4 w-4" /></Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}><AppIcon name="delete" className="h-4 w-4" /></Button>
                    </div>
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
