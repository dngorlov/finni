/**
 * Original sound effects for finni.
 * Synthesized here so the app does not ship samples from Duolingo, Talking Tom, or any other game.
 * Run: node scripts/generate-sfx.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const outDir = join(dirname(fileURLToPath(import.meta.url)), "../assets/sounds");

function buffer(seconds) {
  return new Float64Array(Math.ceil(seconds * SR));
}

function mallet(buf, t0, freq, dur, amp, brightness) {
  const i0 = Math.floor(t0 * SR);
  const n = Math.min(buf.length - i0, Math.floor(dur * SR));
  const partials = [
    { ratio: 1, amp: 1, decay: 3.2 / dur },
    { ratio: 2.0, amp: 0.45 * brightness, decay: 9 / dur },
    { ratio: 3.01, amp: 0.22 * brightness, decay: 14 / dur },
    { ratio: 4.2, amp: 0.08 * brightness, decay: 20 / dur },
  ];
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const attack = 1 - Math.exp(-t * 600);
    let sample = 0;
    for (const partial of partials) {
      sample += Math.sin(2 * Math.PI * freq * partial.ratio * t) * partial.amp * Math.exp(-t * partial.decay);
    }
    buf[i0 + i] += sample * attack * amp;
  }
}

/** Cartoon voice: two sweeps, like a short pet yip rather than a recorded sample. */
function yip(buf, t0, f0, f1, dur, amp) {
  const i0 = Math.floor(t0 * SR);
  const n = Math.min(buf.length - i0, Math.floor(dur * SR));
  let low = 0;
  let high = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / n;
    const env = Math.sin(Math.PI * t) ** 0.8;
    low += (2 * Math.PI * (f0 + (f1 - f0) * t)) / SR;
    high += (2 * Math.PI * (f0 * 2.4 + (f1 * 2.2 - f0 * 2.4) * t)) / SR;
    buf[i0 + i] += (Math.sin(low) * 0.75 + Math.sin(high) * 0.25) * env * amp;
  }
}

function writeWav(name, samples) {
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  // Headroom: at full volume a cue should sit well under phone notifications (−7 dB peak).
  const gain = peak > 0 ? 0.45 / peak : 0;
  const data = Buffer.alloc(samples.length * 2);
  const fade = Math.floor(0.008 * SR);
  for (let i = 0; i < samples.length; i += 1) {
    let edge = 1;
    if (i < fade) edge = i / fade;
    else if (i > samples.length - fade) edge = (samples.length - i) / fade;
    const clamped = Math.max(-1, Math.min(1, samples[i] * gain * edge));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(outDir, name), Buffer.concat([header, data]));
}

/** Soft two-note «ding»: an octave lower than the first draft, no squeak or 2.6 kHz sparkle (2026-09-28: it hurt ears). */
function correct() {
  const buf = buffer(0.5);
  mallet(buf, 0, 523.25, 0.22, 0.6, 0.35);
  mallet(buf, 0.09, 659.25, 0.36, 0.75, 0.35);
  return buf;
}

function wrong() {
  const buf = buffer(0.48);
  yip(buf, 0, 420, 210, 0.22, 0.14);
  mallet(buf, 0, 392, 0.2, 0.55, 0.25);
  mallet(buf, 0.12, 311.13, 0.3, 0.62, 0.2);
  return buf;
}

function almost() {
  const buf = buffer(0.4);
  mallet(buf, 0, 783.99, 0.16, 0.55, 0.55);
  mallet(buf, 0.09, 880, 0.22, 0.5, 0.45);
  return buf;
}

/** Gentle arpeggio G–C–E–G, low brightness, no yip. */
function complete() {
  const buf = buffer(1.0);
  mallet(buf, 0, 392.0, 0.28, 0.5, 0.35);
  mallet(buf, 0.12, 523.25, 0.28, 0.55, 0.35);
  mallet(buf, 0.24, 659.25, 0.3, 0.6, 0.35);
  mallet(buf, 0.36, 783.99, 0.55, 0.7, 0.4);
  return buf;
}

writeWav("correct.wav", correct());
writeWav("wrong.wav", wrong());
writeWav("almost.wav", almost());
writeWav("complete.wav", complete());
