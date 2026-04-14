import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import { AdminCheck, getSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const canAccessAdmin = await AdminCheck(session);
  if (!canAccessAdmin) {
    redirect("/schedule/teachers");
  }

  return <AdminShell>{children}</AdminShell>;
}
