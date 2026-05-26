import { NextResponse } from "next/server";

import { updateIpAuthApproval } from "@/lib/api/ip-auth-status";
import {
  apiErrorResponse,
  invalidIdResponse,
  parseRouteId,
  requireAdminOnly,
} from "@/lib/api/route-helpers";

const FORBIDDEN_MESSAGE = "Только администратор может подтверждать IP-входы";
const NOT_FOUND_MESSAGE = "Запись не найдена";
const UNKNOWN_ERROR_MESSAGE = "Неизвестная ошибка";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { error: adminError } = await requireAdminOnly(FORBIDDEN_MESSAGE);
    if (adminError) return adminError;

    const id = parseRouteId(params.id);
    if (!id) return invalidIdResponse();

    const body = await request.json().catch(() => ({}));
    const approved = body.approved !== false;
    const result = await updateIpAuthApproval(id, approved);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 404 });
    }

    return NextResponse.json({ message: approved ? "IP подтверждён" : "IP переведён в ожидание" });
  } catch (err: unknown) {
    return apiErrorResponse(err, UNKNOWN_ERROR_MESSAGE);
  }
}
