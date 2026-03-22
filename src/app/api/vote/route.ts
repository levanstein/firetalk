import { NextRequest, NextResponse } from "next/server";
import { updateVotes } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const { slug, company } = await req.json();

  if (!slug || !["a", "b"].includes(company)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const votes = await updateVotes(slug, company as "a" | "b");
    return NextResponse.json(votes);
  } catch (err) {
    if (err instanceof Error && err.message.includes("NOT_FOUND")) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Could not save vote. Try again." },
      { status: 500 }
    );
  }
}
