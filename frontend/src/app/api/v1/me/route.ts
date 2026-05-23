/**
 * /api/v1/me — current user profile + PATCH for updates + DELETE for
 * GDPR account deletion + /export for data download.
 */
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getId() {
  const session = await getServerSession(authOptions);
  return (session as { backendId?: string } | null)?.backendId;
}

export async function GET() {
  const id = await getId();
  if (!id) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const res = await fetch(`${API_URL}/api/v1/me`, {
    headers: { "X-User-Id": id },
    cache: "no-store",
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PATCH(req: NextRequest) {
  const id = await getId();
  if (!id) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = await req.json();
  const res = await fetch(`${API_URL}/api/v1/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-User-Id": id },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE() {
  const id = await getId();
  if (!id) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const res = await fetch(`${API_URL}/api/v1/me`, {
    method: "DELETE",
    headers: { "X-User-Id": id },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
