import { getAudioFile } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; index: string }> }
) {
  const { slug, index } = await params;
  const buffer = await getAudioFile(slug, parseInt(index, 10));

  if (!buffer) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
