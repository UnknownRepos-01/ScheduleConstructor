"use client";

import React, { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldGroup, FieldLabel, Input, Select } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrapper, TBodyCell, THeadCell } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { ROLE_ADMIN } from "@/lib/access";
import {
  useCreateTeacherMutation,
  useCurrentUserQuery,
  useDeleteTeacherMutation,
  useClassroomsQuery,
  useManagersQuery,
  useTeachersQuery,
  useUpdateTeacherMutation,
} from "@/lib/react-query";

interface UserRecord {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  login: string;
  defaultClassroomId: number | null;
  defaultClassroomNumber?: string | null;
  role: "teacher" | "manager";
}

export default function TeachersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    surname: "",
    patronymic: "",
    login: "",
    password: "",
    defaultClassroomId: "",
    role: "teacher" as "teacher" | "manager",
  });
  const [error, setError] = useState<string | null>(null);

  const { data: currentUserData } = useCurrentUserQuery();
  const isAdmin = currentUserData?.user?.roleName === ROLE_ADMIN;
  const { data, isLoading } = useTeachersQuery();
  const { data: classroomsData } = useClassroomsQuery();
  const { data: managersData, isLoading: isManagersLoading } = useManagersQuery(isAdmin);
  const createTeacherMutation = useCreateTeacherMutation();
  const updateTeacherMutation = useUpdateTeacherMutation();
  const deleteTeacherMutation = useDeleteTeacherMutation();

  const teachers = useMemo(() => (Array.isArray(data) ? (data as Omit<UserRecord, "role">[]) : []), [data]);
  const managers = useMemo(
    () =>
      Array.isArray(managersData)
        ? managersData.map((item) => ({
            ...item,
            defaultClassroomId: null,
            defaultClassroomNumber: null,
          }))
        : [],
    [managersData],
  );
  const users = useMemo<UserRecord[]>(
    () => [
      ...teachers.map((item) => ({ ...item, role: "teacher" as const })),
      ...managers.map((item) => ({ ...item, role: "manager" as const })),
    ],
    [teachers, managers],
  );
  const isSaving = createTeacherMutation.isPending || updateTeacherMutation.isPending;

  const resetForm = () => {
    setForm({ name: "", surname: "", patronymic: "", login: "", password: "", defaultClassroomId: "", role: "teacher" });
    setEditId(null);
    setShowForm(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editId) {
        await updateTeacherMutation.mutateAsync({
          id: editId,
          payload: {
            name: form.name,
            surname: form.surname,
            patronymic: form.patronymic || null,
            login: form.login,
            roleName: form.role === "manager" ? "Менеджер" : "Преподаватель",
            defaultClassroomId: form.defaultClassroomId ? Number.parseInt(form.defaultClassroomId, 10) : null,
            ...(form.password ? { password: form.password } : {}),
          },
        });
      } else {
        if (form.role === "manager" && !isAdmin) {
          setError("Только администратор может создавать менеджеров");
          return;
        }
        await createTeacherMutation.mutateAsync({
          name: form.name,
          surname: form.surname,
          patronymic: form.patronymic || undefined,
          login: form.login,
          password: form.password,
          roleName: form.role === "manager" ? "Менеджер" : "Преподаватель",
          defaultClassroomId: form.defaultClassroomId ? Number.parseInt(form.defaultClassroomId, 10) : null,
        });
      }

      resetForm();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }

      setError("Не удалось сохранить пользователя");
    }
  };

  const handleEdit = (teacher: UserRecord) => {
    setForm({
      name: teacher.name,
      surname: teacher.surname,
      patronymic: teacher.patronymic || "",
      login: teacher.login,
      password: "",
      defaultClassroomId: teacher.defaultClassroomId ? String(teacher.defaultClassroomId) : "",
      role: teacher.role,
    });
    setEditId(teacher.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этого пользователя?")) return;

    try {
      await deleteTeacherMutation.mutateAsync(id);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
        return;
      }

      alert("Не удалось удалить пользователя");
    }
  };

  return (
    <div>
      <PageHeader
        title="Пользователи"
        subtitle="Управление преподавателями и менеджерами, их учётными записями и доступом к системе"
        actions={
          <Button variant="primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <AppIcon name="add" className="h-4 w-4" />
            Добавить пользователя
          </Button>
        }
      />

      <Modal isOpen={showForm} onClose={resetForm} title={editId ? "Редактировать пользователя" : "Добавить пользователя"}>
        {error ? (
          <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit}>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FieldGroup>
              <FieldLabel>Роль *</FieldLabel>
              <select
                className="w-full rounded-md border border-border bg-bg-input px-3.5 py-2.5 text-sm"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as "teacher" | "manager" }))}
              >
                <option value="teacher">Преподаватель</option>
                <option value="manager" disabled={!isAdmin}>Менеджер{!isAdmin ? " (только админ)" : ""}</option>
              </select>
            </FieldGroup>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <FieldGroup>
              <FieldLabel>Фамилия *</FieldLabel>
              <Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} required />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Имя *</FieldLabel>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Отчество</FieldLabel>
              <Input value={form.patronymic} onChange={(e) => setForm({ ...form, patronymic: e.target.value })} />
            </FieldGroup>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FieldGroup>
              <FieldLabel>Логин *</FieldLabel>
              <Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Кабинет по умолчанию</FieldLabel>
              <Select
                value={form.defaultClassroomId}
                onChange={(e) => setForm({ ...form, defaultClassroomId: e.target.value })}
              >
                <option value="">Не задан</option>
                {(classroomsData ?? []).map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.number}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Пароль{editId ? "" : " *"}</FieldLabel>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editId}
                placeholder={editId ? "Оставьте пустым, чтобы не менять пароль" : ""}
              />
            </FieldGroup>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Сохранение..." : editId ? "Сохранить" : "Добавить"}
            </Button>
            <Button type="button" onClick={resetForm}>Отмена</Button>
          </div>
        </form>
      </Modal>

      {isLoading || isManagersLoading ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <Card>
          <EmptyState
            icon="user"
            title="Пользователи пока не добавлены"
            actionLabel="Добавить пользователя"
            onAction={() => { resetForm(); setShowForm(true); }}
          />
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <THeadCell>ID</THeadCell>
                <THeadCell>Роль</THeadCell>
                <THeadCell>ФИО</THeadCell>
                <THeadCell>Логин</THeadCell>
                <THeadCell>Кабинет по умолчанию</THeadCell>
                <THeadCell className="w-[140px]">Действия</THeadCell>
              </tr>
            </thead>
            <tbody>
              {users.map((teacher) => (
                <tr key={teacher.id}>
                  <TBodyCell>{teacher.id}</TBodyCell>
                  <TBodyCell>
                    <Badge>{teacher.role === "manager" ? "Менеджер" : "Преподаватель"}</Badge>
                  </TBodyCell>
                  <TBodyCell className="font-semibold">
                    {teacher.surname} {teacher.name} {teacher.patronymic || ""}
                  </TBodyCell>
                  <TBodyCell><Badge>{teacher.login}</Badge></TBodyCell>
                  <TBodyCell>{teacher.defaultClassroomNumber ?? "—"}</TBodyCell>
                  <TBodyCell>
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => handleEdit(teacher)}><AppIcon name="edit" className="h-4 w-4" /></Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(teacher.id)}><AppIcon name="delete" className="h-4 w-4" /></Button>
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
