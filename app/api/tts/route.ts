import { NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";
import * as lamejs from "lamejs"; // UMD import for Bun/Next.js

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).MPEGMode = (lamejs as any).MPEGMode;
// Float32 → Int16 PCM
function floatTo16BitPCM(float32Array: Float32Array) {
  const buffer = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return buffer;
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // 1️⃣ Load TTS model
    const tts = await pipeline("text-to-speech", "Xenova/mms-tts-fra", {});

    // 2️⃣ Generate audio (Float32)
    const result = await tts(text, {});

    // 3️⃣ Convert to Int16 PCM
    const pcm = floatTo16BitPCM(result.audio);
    const sampleRate = result.sampling_rate;

    // 4️⃣ Encode MP3
    const encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
    const mp3Chunks: Uint8Array[] = [];
    const CHUNK = 1152;

    for (let i = 0; i < pcm.length; i += CHUNK) {
      const slice = pcm.subarray(i, i + CHUNK);
      const mp3buf = encoder.encodeBuffer(slice);
      if (mp3buf.length > 0) mp3Chunks.push(mp3buf);
    }

    const end = encoder.flush();
    if (end.length > 0) mp3Chunks.push(end);

    // Combine into single buffer
    const mp3Buffers = mp3Chunks.map(b => Buffer.from(b));
    const totalLength = mp3Buffers.reduce((a, b) => a + b.length, 0);
    const mp3Buffer = Buffer.concat(mp3Buffers, totalLength);

    // 5️⃣ Return MP3
    return new Response(mp3Buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `inline; filename="tts.mp3"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate MP3" }, { status: 500 });
  }
}
