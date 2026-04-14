"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrapper, TBodyCell, THeadCell } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { useIpAuthsQuery, useUpdateIpAuthMutation } from "@/lib/react-query";

export default function IpAuthsPage() {
  const { data, isLoading, isError, error } = useIpAuthsQuery();
  const updateMutation = useUpdateIpAuthMutation();

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    const message = error instanceof ApiError ? error.message : "Не удалось загрузить заявки на подтверждение IP";
    return (
      <Card>
        <div className="rounded-md border border-danger-border bg-danger-light px-4 py-3 text-sm text-danger">
          {message}
        </div>
      </Card>
    );
  }

  const rows = data ?? [];

  const handleApprove = async (id: number, approved: boolean) => {
    await updateMutation.mutateAsync({ id, approved });
  };

  return (
    <div>
      <PageHeader
        title="Подтверждение IP"
        subtitle="Подтверждайте входы с новых или просроченных IP-адресов пользователей."
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="check" title="Нет заявок на подтверждение IP" />
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <THeadCell>ID</THeadCell>
                <THeadCell>Пользователь</THeadCell>
                <THeadCell>Логин</THeadCell>
                <THeadCell>IP</THeadCell>
                <THeadCell>Статус</THeadCell>
                <THeadCell>Создано</THeadCell>
                <THeadCell className="w-[220px]">Действия</THeadCell>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <TBodyCell>{row.id}</TBodyCell>
                  <TBodyCell>{row.user ? `${row.user.surname} ${row.user.name}` : "—"}</TBodyCell>
                  <TBodyCell>{row.user?.login || "—"}</TBodyCell>
                  <TBodyCell><Badge>{row.ip}</Badge></TBodyCell>
                  <TBodyCell>{row.statusName || "—"}</TBodyCell>
                  <TBodyCell>{new Date(row.createdAt).toLocaleString("ru-RU")}</TBodyCell>
                  <TBodyCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => handleApprove(row.id, true)} disabled={updateMutation.isPending}>
                        Подтвердить
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(row.id, false)} disabled={updateMutation.isPending}>
                        В ожидание
                      </Button>
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
