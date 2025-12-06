"use client";
import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("Bonjour tout le monde");
  const [audioUrl, setAudioUrl] = useState("");

  async function generate() {
    const res = await fetch("/api/tts", {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return alert("Failed to generate audio");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Text → Speech (WAV)</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        style={{ width: "100%", marginBottom: 20 }}
      />

      <button onClick={generate} style={{ padding: 10 }}>
        Générer audio
      </button>

      {audioUrl && (
        <div style={{ marginTop: 20 }}>
          <audio controls src={audioUrl}></audio>
        </div>
      )}
    </main>
  );
}
