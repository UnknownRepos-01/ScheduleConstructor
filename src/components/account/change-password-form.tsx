"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FieldGroup, FieldLabel, Input } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api";
import { useChangePasswordMutation, useCurrentUserQuery } from "@/lib/react-query";

type ChangePasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type PasswordField = {
  id: string;
  name: keyof ChangePasswordFormState;
  label: string;
  helper?: string;
};

const EMPTY_FORM: ChangePasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const PASSWORD_FIELDS: PasswordField[] = [
  { id: "current-password", name: "currentPassword", label: "Текущий пароль" },
  {
    id: "new-password",
    name: "newPassword",
    label: "Новый пароль",
    helper: "Минимум 8 символов, хотя бы одна буква и одна цифра.",
  },
  { id: "confirm-password", name: "confirmPassword", label: "Подтверждение нового пароля" },
];

const getErrorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : "Не удалось изменить пароль";

export function ChangePasswordForm() {
  const router = useRouter();
  const { data: currentUserData } = useCurrentUserQuery();
  const changePasswordMutation = useChangePasswordMutation();
  const [form, setForm] = useState<ChangePasswordFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentUser = currentUserData?.user;
  const saving = changePasswordMutation.isPending;
  const updateFormField = (field: keyof ChangePasswordFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(getErrorMessage(err));
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
            {PASSWORD_FIELDS.map((field) => (
              <FieldGroup key={field.name}>
                <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
                <Input
                  id={field.id}
                  type="password"
                  value={form[field.name]}
                  onChange={(event) => updateFormField(field.name, event.target.value)}
                  required
                />
                {field.helper ? <p className="text-xs text-text-tertiary">{field.helper}</p> : null}
              </FieldGroup>
            ))}

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
