import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { Debate } from "./types";

/*
 * S3-backed storage for FireTalk.
 *
 * STORAGE LAYOUT (S3):
 *   debates/{slug}.json     — debate metadata
 *   audio/{slug}-{index}.mp3 — audio files (served via CloudFront)
 *
 * Falls back to local filesystem if DATA_BUCKET_NAME is not set (dev mode).
 */

const BUCKET_NAME = process.env.DATA_BUCKET_NAME;
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

// Local filesystem fallback for development
async function localFallback() {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const DATA_DIR = path.join(process.cwd(), ".data");
  const DEBATES_DIR = path.join(DATA_DIR, "debates");
  const AUDIO_DIR = path.join(DATA_DIR, "audio");
  const PUBLIC_AUDIO_DIR = path.join(process.cwd(), "public", "audio");
  await fs.mkdir(DEBATES_DIR, { recursive: true });
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  await fs.mkdir(PUBLIC_AUDIO_DIR, { recursive: true });
  return { fs, path, DEBATES_DIR, AUDIO_DIR, PUBLIC_AUDIO_DIR };
}

export async function saveDebate(debate: Debate): Promise<void> {
  if (!BUCKET_NAME) {
    const { fs, path, DEBATES_DIR } = await localFallback();
    await fs.writeFile(path.join(DEBATES_DIR, `${debate.slug}.json`), JSON.stringify(debate, null, 2));
    return;
  }

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `debates/${debate.slug}.json`,
    Body: JSON.stringify(debate, null, 2),
    ContentType: "application/json",
  }));
}

export async function getDebate(slug: string): Promise<Debate | null> {
  if (!BUCKET_NAME) {
    const { fs, path, DEBATES_DIR } = await localFallback();
    try {
      const data = await fs.readFile(path.join(DEBATES_DIR, `${slug}.json`), "utf-8");
      return JSON.parse(data) as Debate;
    } catch {
      return null;
    }
  }

  try {
    const res = await s3.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `debates/${slug}.json`,
    }));
    const body = await res.Body?.transformToString();
    return body ? (JSON.parse(body) as Debate) : null;
  } catch {
    return null;
  }
}

export async function saveAudioFile(
  slug: string,
  index: number,
  buffer: Buffer
): Promise<string> {
  const filename = `${slug}-${index}.mp3`;

  if (!BUCKET_NAME) {
    const { fs, path, AUDIO_DIR, PUBLIC_AUDIO_DIR } = await localFallback();
    const audioPath = path.join(AUDIO_DIR, filename);
    const publicPath = path.join(PUBLIC_AUDIO_DIR, filename);
    await fs.writeFile(audioPath, buffer);
    try { await fs.unlink(publicPath); } catch { /* ignore */ }
    await fs.copyFile(audioPath, publicPath);
    return `/audio/${filename}`;
  }

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `audio/${filename}`,
    Body: buffer,
    ContentType: "audio/mpeg",
  }));

  // Return CloudFront-served URL via the data bucket
  return `/api/audio/${slug}/${index}`;
}

export async function getAudioFile(slug: string, index: number): Promise<Buffer | null> {
  if (!BUCKET_NAME) return null;

  try {
    const res = await s3.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `audio/${slug}-${index}.mp3`,
    }));
    const bytes = await res.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch {
    return null;
  }
}

export async function updateVotes(
  slug: string,
  company: "a" | "b"
): Promise<{ votesA: number; votesB: number }> {
  const debate = await getDebate(slug);
  if (!debate) throw new Error("NOT_FOUND: Debate not found");

  if (company === "a") debate.votesA += 1;
  else debate.votesB += 1;

  await saveDebate(debate);
  return { votesA: debate.votesA, votesB: debate.votesB };
}

export async function listDebates(): Promise<Debate[]> {
  if (!BUCKET_NAME) {
    const { fs, path, DEBATES_DIR } = await localFallback();
    const files = await fs.readdir(DEBATES_DIR);
    const debates: Debate[] = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        const data = await fs.readFile(path.join(DEBATES_DIR, file), "utf-8");
        debates.push(JSON.parse(data) as Debate);
      }
    }
    return debates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: "debates/",
    }));

    const debates: Debate[] = [];
    for (const obj of res.Contents || []) {
      if (!obj.Key?.endsWith(".json")) continue;
      try {
        const getRes = await s3.send(new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: obj.Key,
        }));
        const body = await getRes.Body?.transformToString();
        if (body) debates.push(JSON.parse(body) as Debate);
      } catch {
        // skip corrupt files
      }
    }

    return debates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("[storage] Failed to list debates from S3:", err);
    return [];
  }
}
