/** Public video search proxy. */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q.trim()) return NextResponse.json({ videos: [], query: "" });
  const res = await fetch(
    `${API_URL}/api/v1/search?q=${encodeURIComponent(q)}&limit=30`,
    { cache: "no-store" },
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
