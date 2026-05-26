"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldGroup, FieldLabel, Input } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api";
import { ROLE_ADMIN } from "@/lib/access";
import { useCreateManagerMutation, useCurrentUserQuery } from "@/lib/react-query";

export default function ManagersPage() {
  const { data: currentUserData } = useCurrentUserQuery();
  const createManagerMutation = useCreateManagerMutation();
  const [form, setForm] = useState({
    surname: "",
    name: "",
    patronymic: "",
    login: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentUser = currentUserData?.user;
  const isAdmin = currentUser?.roleName === ROLE_ADMIN;
  const saving = createManagerMutation.isPending;
  const updateFormField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await createManagerMutation.mutateAsync({
        name: form.name,
        surname: form.surname,
        patronymic: form.patronymic || undefined,
        login: form.login,
        password: form.password,
      });

      setSuccess(response.message || "Менеджер создан");
      setForm({ surname: "", name: "", patronymic: "", login: "", password: "" });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      setError("Не удалось создать менеджера");
    }
  };

  return (
    <div>
      <PageHeader
        title="Менеджеры"
        subtitle="Создание пользователей с ролью Менеджер. Доступно только администратору."
      />

      {!isAdmin ? (
        <Card>
          <div className="rounded-md border border-warning-border bg-warning-light px-4 py-3 text-sm text-warning">
            Только администратор может создавать пользователей с ролью «Менеджер».
          </div>
        </Card>
      ) : (
        <Card className="max-w-[760px]">
          {error ? (
            <div className="mb-4 rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mb-4 rounded-md border border-success/40 bg-success-light px-3.5 py-2.5 text-[13px] font-medium text-success">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <FieldGroup>
                <FieldLabel>Фамилия *</FieldLabel>
                <Input value={form.surname} onChange={(e) => updateFormField("surname", e.target.value)} required />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Имя *</FieldLabel>
                <Input value={form.name} onChange={(e) => updateFormField("name", e.target.value)} required />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Отчество</FieldLabel>
                <Input value={form.patronymic} onChange={(e) => updateFormField("patronymic", e.target.value)} />
              </FieldGroup>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <FieldGroup>
                <FieldLabel>Логин *</FieldLabel>
                <Input value={form.login} onChange={(e) => updateFormField("login", e.target.value)} required />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Пароль *</FieldLabel>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateFormField("password", e.target.value)}
                  required
                />
                <p className="text-xs text-text-tertiary">Минимум 8 символов, хотя бы одна буква и одна цифра.</p>
              </FieldGroup>
            </div>

            <Button type="submit" variant="primary" disabled={saving}>
              <AppIcon name="add" className="h-4 w-4" />
              {saving ? "Создание..." : "Создать менеджера"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
