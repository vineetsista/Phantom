/** GDPR export — returns JSON blob of all user data. */
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET() {
  const session = await getServerSession(authOptions);
  const id = (session as { backendId?: string } | null)?.backendId;
  if (!id) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const res = await fetch(`${API_URL}/api/v1/me/export`, {
    headers: { "X-User-Id": id },
  });
  const data = await res.json();
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
