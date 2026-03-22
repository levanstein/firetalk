import { promises as fs } from "fs";
import path from "path";
import type { Debate } from "./types";

/*
 * Local file-based storage for hackathon MVP.
 * In production, replace with S3 + DynamoDB.
 *
 * STORAGE LAYOUT:
 *   .data/debates/{slug}.json     — debate metadata
 *   .data/audio/{slug}-{index}.mp3 — audio files
 *   public/audio/{slug}-{index}.mp3 — symlinked for serving
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DEBATES_DIR = path.join(DATA_DIR, "debates");
const AUDIO_DIR = path.join(DATA_DIR, "audio");
const PUBLIC_AUDIO_DIR = path.join(process.cwd(), "public", "audio");

async function ensureDirs() {
  await fs.mkdir(DEBATES_DIR, { recursive: true });
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_AUDIO_DIR, { recursive: true });
}

export async function saveDebate(debate: Debate): Promise<void> {
  await ensureDirs();
  const filePath = path.join(DEBATES_DIR, `${debate.slug}.json`);
  await fs.writeFile(filePath, JSON.stringify(debate, null, 2));
}

export async function getDebate(slug: string): Promise<Debate | null> {
  await ensureDirs();
  const filePath = path.join(DEBATES_DIR, `${slug}.json`);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as Debate;
  } catch {
    return null;
  }
}

export async function saveAudioFile(
  slug: string,
  index: number,
  buffer: Buffer
): Promise<string> {
  await ensureDirs();
  const filename = `${slug}-${index}.mp3`;
  const audioPath = path.join(AUDIO_DIR, filename);
  const publicPath = path.join(PUBLIC_AUDIO_DIR, filename);

  await fs.writeFile(audioPath, buffer);
  try {
    await fs.unlink(publicPath);
  } catch {
    // ignore if doesn't exist
  }
  await fs.copyFile(audioPath, publicPath);

  return `/audio/${filename}`;
}

export async function updateVotes(
  slug: string,
  company: "a" | "b"
): Promise<{ votesA: number; votesB: number }> {
  const debate = await getDebate(slug);
  if (!debate) throw new Error("NOT_FOUND: Debate not found");

  if (company === "a") {
    debate.votesA += 1;
  } else {
    debate.votesB += 1;
  }

  await saveDebate(debate);
  return { votesA: debate.votesA, votesB: debate.votesB };
}

export async function listDebates(): Promise<Debate[]> {
  await ensureDirs();
  const files = await fs.readdir(DEBATES_DIR);
  const debates: Debate[] = [];
  for (const file of files) {
    if (file.endsWith(".json")) {
      const data = await fs.readFile(path.join(DEBATES_DIR, file), "utf-8");
      debates.push(JSON.parse(data) as Debate);
    }
  }
  return debates.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
