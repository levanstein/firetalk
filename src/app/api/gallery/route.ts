import { NextResponse } from "next/server";
import { listDebates } from "@/lib/storage";

export async function GET() {
  const debates = await listDebates();
  return NextResponse.json({ debates: debates.slice(0, 20) });
}
