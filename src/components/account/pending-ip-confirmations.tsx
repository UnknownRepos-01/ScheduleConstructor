"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { AppIcon } from "@/components/ui/icons";
import { ApiError } from "@/lib/api";
import { useConfirmSelfIpAuthMutation, useSelfPendingIpAuthsQuery } from "@/lib/react-query";

export function PendingIpConfirmations() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { data, isLoading } = useSelfPendingIpAuthsQuery();
  const confirmMutation = useConfirmSelfIpAuthMutation();

  const records = data?.records ?? [];
  const canConfirm = data?.canConfirmFromCurrentIp ?? false;

  const handleConfirm = async (id: number) => {
    setError(null);
    setSuccess(null);

    try {
      const response = await confirmMutation.mutateAsync({ id });
      setSuccess(response.message);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      setError("Не удалось подтвердить IP-адрес");
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="flex items-center gap-2">
          <AppIcon name="check" className="h-5 w-5 text-text-secondary" />
          Подтверждение входа по IP
        </h3>
      </CardHeader>

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

      {!canConfirm ? (
        <div className="mb-4 rounded-md border border-warning-border bg-warning-light px-3.5 py-2.5 text-[13px] font-medium text-warning">
          Подтверждение новых IP доступно только из уже подтверждённой сессии.
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-text-tertiary">Загрузка заявок...</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-text-tertiary">Нет ожидающих заявок на подтверждение IP.</p>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge>{record.ip}</Badge>
                <span className="text-text-tertiary">{new Date(record.createdAt).toLocaleString("ru-RU")}</span>
              </div>
              <Button size="sm" variant="success" onClick={() => handleConfirm(record.id)} disabled={confirmMutation.isPending || !canConfirm}>
                Подтвердить
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
