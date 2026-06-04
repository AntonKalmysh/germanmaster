// Noun review API. GET lists all review records for a level; POST saves a
// correction (or clears one). Dev-only tool — writes to the corrections file.
import { NextRequest, NextResponse } from "next/server";
import { loadReview, writeCorrection, type Correction } from "@/lib/reviewServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const level = req.nextUrl.searchParams.get("level") ?? "a1";
  try {
    return NextResponse.json({ level, records: loadReview(level) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const level = req.nextUrl.searchParams.get("level") ?? "a1";
  const body = (await req.json()) as { id: string; correction: Correction | null };
  if (!body?.id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  try {
    writeCorrection(level, body.id, body.correction);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
