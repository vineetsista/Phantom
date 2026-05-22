/**
 * /api/v1/generate proxy.
 *
 * Validates the NextAuth session, extracts backendId from the JWT, then
 * forwards the request to the FastAPI backend with X-User-Id set. The
 * backend trusts this header (because the only public entrypoint is
 * this proxy in production — direct backend access is firewalled off).
 */
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const backendId = (session as { backendId?: string } | null)?.backendId;
  const body = await req.json();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (backendId) headers["X-User-Id"] = backendId;

  const res = await fetch(`${API_URL}/api/v1/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
