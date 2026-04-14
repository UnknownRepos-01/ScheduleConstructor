import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/account/change-password-form";
import { PendingIpConfirmations } from "@/components/account/pending-ip-confirmations";
import { getSession } from "@/lib/auth";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6">
      <ChangePasswordForm />
      <div className="mx-auto w-full max-w-[620px]">
        <PendingIpConfirmations />
      </div>
    </div>
  );
}
