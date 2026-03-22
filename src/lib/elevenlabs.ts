import pLimit from "p-limit";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

const VOICES: Record<string, string> = {
  a: "pNInz6obpgDQGcFmaJgB", // Adam - deep male
  b: "21m00Tcm4TlvDq8ikWAM", // Rachel - confident female
};

const limit = pLimit(3);

export async function generateAudio(
  text: string,
  voiceKey: "a" | "b"
): Promise<Buffer> {
  const voiceId = VOICES[voiceKey];

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (res.status === 429) {
    throw new Error("QUOTA_EXHAUSTED: Voice generation limit reached");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `AUDIO_ERROR: ElevenLabs returned ${res.status}: ${body.slice(0, 200)}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateAllAudio(
  turns: { text: string; company: string }[],
  companyASlug: string
): Promise<Buffer[]> {
  const tasks = turns.map((turn, i) =>
    limit(async () => {
      const voiceKey = turn.company === companyASlug ? "a" : "b";
      try {
        return await generateAudio(turn.text, voiceKey as "a" | "b");
      } catch (err) {
        if (
          err instanceof Error &&
          !err.message.includes("QUOTA_EXHAUSTED")
        ) {
          return await generateAudio(turn.text, voiceKey as "a" | "b");
        }
        throw err;
      }
    })
  );

  return Promise.all(tasks);
}
