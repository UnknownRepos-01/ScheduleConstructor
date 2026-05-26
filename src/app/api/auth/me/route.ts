import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api/route-helpers";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: session });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
