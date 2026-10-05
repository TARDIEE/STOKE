import { NextResponse } from "next/server";
import { COUNTRIES, EXAMS, examTotals } from "@/lib/exams";

export async function GET() {
  return NextResponse.json({
    countries: COUNTRIES,
    exams: EXAMS.map((e) => ({
      id: e.id,
      name: e.name,
      region: e.region,
      tagline: e.tagline,
      typicalMonth: e.typicalMonth,
      country: e.country,
      level: e.level,
      grade: e.grade ?? null,
      subjects: e.subjects.map((s) => s.name),
      ...examTotals(e),
    })),
  });
}
