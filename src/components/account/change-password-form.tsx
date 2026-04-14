"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FieldGroup, FieldLabel, Input } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api";
import { useChangePasswordMutation, useCurrentUserQuery } from "@/lib/react-query";

export function ChangePasswordForm() {
  const router = useRouter();
  const { data: currentUserData } = useCurrentUserQuery();
  const changePasswordMutation = useChangePasswordMutation();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentUser = currentUserData?.user;
  const saving = changePasswordMutation.isPending;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.currentPassword) {
      setError("Введите текущий пароль");
      return;
    }

    if (!form.newPassword) {
      setError("Введите новый пароль");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Подтверждение пароля не совпадает");
      return;
    }

    try {
      const response = await changePasswordMutation.mutateAsync(form);
      setSuccess(response.message || "Пароль успешно изменён");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      setError("Не удалось изменить пароль");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[620px]">
      <Card>
        <CardHeader>
          <h3 className="flex items-center gap-2">
            <AppIcon name="user" className="h-5 w-5 text-text-secondary" />
            Смена пароля
          </h3>
          <p className="text-sm text-text-tertiary">
            Пользователь: {currentUser ? `${currentUser.surname} ${currentUser.name}` : "—"}
          </p>
        </CardHeader>
        <div>
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

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <FieldGroup>
              <FieldLabel htmlFor="current-password">Текущий пароль</FieldLabel>
              <Input
                id="current-password"
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                required
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="new-password">Новый пароль</FieldLabel>
              <Input
                id="new-password"
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                required
              />
              <p className="text-xs text-text-tertiary">Минимум 8 символов, хотя бы одна буква и одна цифра.</p>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="confirm-password">Подтверждение нового пароля</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
              />
            </FieldGroup>

            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Сохранение..." : "Сменить пароль"}
              </Button>
              <Button type="button" onClick={() => router.back()}>
                Назад
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
