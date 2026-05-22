/**
 * Stripe Checkout proxy. Adds X-User-Id from the NextAuth session so
 * the backend can identify which user is upgrading.
 */
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const backendId = (session as { backendId?: string } | null)?.backendId;
  if (!backendId) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }
  const body = await req.json();
  const res = await fetch(`${API_URL}/api/v1/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": backendId },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
