import { NextRequest, NextResponse } from "next/server";
import { getDebate } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const debate = await getDebate(slug);

  if (!debate) {
    return NextResponse.json({ error: "Debate not found" }, { status: 404 });
  }

  return NextResponse.json(debate);
}
