import { NextResponse } from "next/server";
import { SKILLS_REGISTRY } from "@/lib/skills";

export async function GET() {
  return NextResponse.json({
    workflow: "charity-copywriting-pipeline",
    skills: SKILLS_REGISTRY,
  });
}
