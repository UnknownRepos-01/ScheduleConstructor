import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { ipAuths } from "@/db/schema";
import { getIpAuthStatusIds } from "@/lib/auth";

export async function updateIpAuthApproval(id: number, approved: boolean) {
  const { confirmedStatusId, pendingStatusId } = await getIpAuthStatusIds();

  const [result] = await db
    .update(ipAuths)
    .set({ statusId: approved ? confirmedStatusId : pendingStatusId, createdAt: new Date() })
    .where(eq(ipAuths.id, id));

  return result;
}
