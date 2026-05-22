/**
 * /api/v1/me — returns the current user's profile + plan + quota state.
 * Proxies to the backend's /api/v1/me which reads from the users table.
 */
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET() {
  const session = await getServerSession(authOptions);
  const backendId = (session as { backendId?: string } | null)?.backendId;
  if (!backendId) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const res = await fetch(`${API_URL}/api/v1/me`, {
    headers: { "X-User-Id": backendId },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
