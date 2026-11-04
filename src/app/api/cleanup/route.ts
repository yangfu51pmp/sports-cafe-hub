import { NextResponse } from "next/server";
import { runSystemCleanup } from "@/lib/cleanup";

export async function POST() {
  try {
    const summary = await runSystemCleanup();
    return NextResponse.json({ ok: true, summary });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
