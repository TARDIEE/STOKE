import { NextResponse } from "next/server";
import { EXAMS, examTotals } from "@/lib/exams";

export async function GET() {
  return NextResponse.json({
    exams: EXAMS.map((e) => ({
      id: e.id,
      name: e.name,
      region: e.region,
      tagline: e.tagline,
      typicalMonth: e.typicalMonth,
      subjects: e.subjects.map((s) => s.name),
      ...examTotals(e),
    })),
  });
}
