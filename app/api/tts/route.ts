import { NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";

// Convert Float32Array → WAV Buffer
function floatToWav(float32Array: Float32Array, sampleRate = 16000) {
  const buffer = Buffer.alloc(44 + float32Array.length * 2);

  // WAV header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + float32Array.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24); // sample rate
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);   // block align
  buffer.writeUInt16LE(16, 34);  // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(float32Array.length * 2, 40);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    buffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, offset);
    offset += 2;
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

    // 2️⃣ Generate audio
    const result = await tts(text, {});

    // 3️⃣ Convert PCM → WAV
    const wavBuffer = floatToWav(result.audio, result.sampling_rate);

    return new Response(wavBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `inline; filename="tts.wav"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}
