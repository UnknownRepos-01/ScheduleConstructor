"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/icons";
import { FieldGroup, FieldLabel, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/loading-state";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import { canAccessAdminPanel, ROLE_TEACHER } from "@/lib/access";
import { useTheme } from "@/components/hooks/use-theme";
import { useCurrentUserQuery, useLoginMutation } from "@/lib/react-query";

const getPostLoginPath = (roleName: string | undefined) => {
  if (roleName === ROLE_TEACHER) return "/schedule/teachers";
  if (canAccessAdminPanel(roleName)) return "/admin";
  return "/schedule";
};

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { data: currentUserData } = useCurrentUserQuery();
  const loginMutation = useLoginMutation();
  const loading = loginMutation.isPending;

  useEffect(() => {
    const user = currentUserData?.user;
    if (!user) return;

    router.replace(getPostLoginPath(user.roleName));
  }, [currentUserData?.user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(false);

    try {
      const data = await loginMutation.mutateAsync({ login, password });
      router.push(getPostLoginPath(data.user?.roleName));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 && err.data?.pending) {
          setPending(true);
        }

        setError(err.message);
        return;
      }

      setError("Не удалось выполнить вход. Попробуйте ещё раз.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-primary px-4 py-10">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-52 h-[600px] w-[600px] animate-float rounded-full bg-accent-primary/30 blur-[80px]" />
        <div className="absolute -bottom-24 -left-24 h-[400px] w-[400px] animate-float-reverse rounded-full bg-accent-secondary/30 blur-[80px]" />
      </div>

      <div className="absolute right-6 top-5 z-10">
        <ThemeToggle isDark={theme === "dark"} onToggle={toggleTheme} />
      </div>

      <div className="relative z-10 w-full max-w-[420px] rounded-xl border border-border bg-bg-card p-10 shadow-xl max-sm:px-7 max-sm:py-8">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-accent-gradient text-white shadow-[0_4px_16px_rgba(79,110,247,0.3)]">
            <AppIcon name="schedule" className="h-8 w-8" strokeWidth={2.25} />
          </div>
          <h1 className="mb-1 text-[1.375rem]">Конструктор школьного расписания</h1>
          <p className="text-sm text-text-tertiary">Войдите в систему, чтобы управлять расписанием, классами, преподавателями и кабинетами.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && !pending ? (
            <div className="rounded-md border border-danger-border bg-danger-light px-3.5 py-2.5 text-[13px] font-medium text-danger">
              {error}
            </div>
          ) : null}
          {pending ? (
            <div className="rounded-md border border-warning-border bg-warning-light px-3.5 py-2.5 text-[13px] font-medium text-warning">
              <span className="inline-flex items-center gap-1.5">
                <AppIcon name="saving" className="h-4 w-4" />
                {error}
              </span>
              <div className="mt-1 text-xs">
                Подтверждение нового IP доступно только из уже подтверждённой сессии в разделе «Аккаунт».
              </div>
            </div>
          ) : null}

          <FieldGroup>
            <FieldLabel htmlFor="login-input">Логин</FieldLabel>
            <Input
              id="login-input"
              type="text"
              placeholder="Введите логин"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              autoFocus
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="password-input">Пароль</FieldLabel>
            <Input
              id="password-input"
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FieldGroup>

          <Button type="submit" variant="primary" disabled={loading} className="mt-2 min-h-11 w-full text-[15px]">
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-[18px] w-[18px] border-2" />
                Выполняется вход...
              </span>
            ) : (
              "Войти"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
