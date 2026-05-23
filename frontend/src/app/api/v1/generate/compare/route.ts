/** Compare-two-repos generator proxy. */
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const id = (session as { backendId?: string } | null)?.backendId;
  const body = await req.json();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (id) headers["X-User-Id"] = id;
  const res = await fetch(`${API_URL}/api/v1/generate/compare`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
