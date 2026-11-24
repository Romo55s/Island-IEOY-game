import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public/audio/cues");
const sampleRate = 22050;

function noise(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 0xffffffff * 2 - 1;
  };
}

function samples(duration, render, { edgeFade = true } = {}) {
  const length = Math.floor(duration * sampleRate);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const edge = edgeFade ? Math.min(1, i / 220, (length - 1 - i) / 220) : 1;
    const raw = render(t, i, length) * Math.max(0, edge);
    const saturated = Math.tanh(raw * 1.4) / Math.tanh(1.4);
    result[i] = Math.round(Math.max(-1, Math.min(1, saturated)) * 192) / 192;
  }
  return result;
}

function normalizePeak(pcm, targetPeak) {
  let peak = 0;
  for (const sample of pcm) peak = Math.max(peak, Math.abs(sample));
  if (peak === 0) return pcm;
  const scale = targetPeak / peak;
  return pcm.map((sample) => sample * scale);
}

function writeWav(filename, pcm) {
  const dataBytes = pcm.length * 2;
  const file = Buffer.alloc(44 + dataBytes);
  file.write("RIFF", 0);
  file.writeUInt32LE(36 + dataBytes, 4);
  file.write("WAVE", 8);
  file.write("fmt ", 12);
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(1, 22);
  file.writeUInt32LE(sampleRate, 24);
  file.writeUInt32LE(sampleRate * 2, 28);
  file.writeUInt16LE(2, 32);
  file.writeUInt16LE(16, 34);
  file.write("data", 36);
  file.writeUInt32LE(dataBytes, 40);
  pcm.forEach((sample, i) => file.writeInt16LE(Math.round(sample * 32767), 44 + i * 2));
  return writeFile(path.join(output, filename), file);
}

function envelope(t, start, duration, power = 2) {
  const x = (t - start) / duration;
  return x < 0 || x > 1 ? 0 : Math.sin(Math.PI * x) ** power;
}

function ambient() {
  const duration = 8;
  const random = noise(404);
  const waves = Array.from({ length: 72 }, (_, index) => {
    const harmonic = index + 1;
    return { harmonic, phase: random() * Math.PI * 2, amplitude: 1 / ((harmonic + 1) ** 0.8) };
  });
  const normalization = waves.reduce((sum, wave) => sum + wave.amplitude, 0);
  const pcm = samples(duration, (t) => {
    const windBed = waves.reduce((sum, wave) => sum + Math.sin(2 * Math.PI * wave.harmonic * t / duration + wave.phase) * wave.amplitude, 0) / normalization;
    const gust = 0.58 + 0.28 * Math.sin(2 * Math.PI * t / duration - 0.7) + 0.1 * Math.sin(4 * Math.PI * t / duration + 1.2);
    const surf = Math.sin(2 * Math.PI * 2 * t / duration + 0.4) * 0.09 + Math.sin(2 * Math.PI * 3 * t / duration + 2.1) * 0.04;
    return windBed * gust * 0.42 + surf * Math.max(0, gust) * 0.34;
  }, { edgeFade: false });
  return normalizePeak(pcm, 0.78);
}

function menuTheme() {
  const bpm = 76;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const duration = bar * 4;
  const chords = [
    [73.42, 110, 146.83], // D minor
    [58.27, 87.31, 116.54], // Bb major
    [65.41, 98, 130.81], // C major
    [55, 82.41, 110], // A minor
  ];
  const melody = [
    [0.5, 293.66], [1.5, 349.23], [2.5, 440], [3.5, 392],
    [4.5, 349.23], [5.5, 293.66], [7, 261.63],
    [8.5, 293.66], [9.5, 392], [11, 440],
    [12.5, 392], [13.5, 349.23], [14.5, 293.66],
  ];
  return samples(duration, (t) => {
    const beatPosition = t % bar;
    const chord = chords[Math.floor(t / bar) % chords.length];
    const padGate = 0.72 + 0.28 * Math.sin(Math.PI * beatPosition / bar);
    const pad = chord.reduce((sum, frequency, index) => sum + Math.sin(2 * Math.PI * frequency * t + index * 0.16) * [0.09, 0.055, 0.035][index], 0) * padGate;
    const bassBeat = Math.floor(t / beat);
    const bassNotes = [55, 55, 43.65, 43.65, 46.25, 46.25, 55, 55];
    const bassPhase = (t % beat) / beat;
    const bass = Math.sin(2 * Math.PI * bassNotes[bassBeat % bassNotes.length] * t) * Math.exp(-bassPhase * 2.6) * 0.14;
    const lead = melody.reduce((sum, [beatAt, frequency]) => {
      const start = beatAt * beat;
      const age = t - start;
      if (age < 0 || age > 0.42) return sum;
      const attack = Math.min(1, age / 0.018);
      const release = Math.exp(-age * 4.3);
      const pulse = Math.sign(Math.sin(2 * Math.PI * frequency * t));
      const overtone = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.18;
      return sum + (pulse * 0.07 + overtone) * attack * release;
    }, 0);
    const tick = [0, 2].includes(Math.floor(t / beat) % 4) && t % beat < 0.024 ? 0.025 * (1 - (t % beat) / 0.024) : 0;
    return pad + bass + lead + tick;
  }, { edgeFade: false });
}

function clickSelect() {
  return samples(0.18, (t) => {
    const f = t < 0.075 ? 580 : 870;
    return Math.sign(Math.sin(2 * Math.PI * f * t)) * Math.exp(-t * 18) * 0.28;
  });
}

function decisionOpen() {
  return samples(0.48, (t) => {
    const rise = envelope(t, 0.04, 0.3, 1);
    return (Math.sin(2 * Math.PI * (480 + t * 720) * t) * 0.18 + Math.sin(2 * Math.PI * 96 * t) * 0.11) * rise;
  });
}

function voteSubmit() {
  return samples(0.34, (t) => {
    const first = envelope(t, 0.015, 0.14);
    const second = envelope(t, 0.16, 0.15);
    return Math.sin(2 * Math.PI * 730 * t) * first * 0.25 + Math.sin(2 * Math.PI * 1090 * t) * second * 0.22;
  });
}

function countdownTick() {
  return samples(0.12, (t) => {
    const decay = Math.exp(-t * 42);
    return (Math.sin(2 * Math.PI * 1480 * t) * 0.18 + Math.sin(2 * Math.PI * 180 * t) * 0.16) * decay;
  });
}

function crashImpact() {
  const random = noise(101);
  return samples(1.25, (t) => {
    const decay = Math.exp(-t * 5.1);
    const thud = Math.sin(2 * Math.PI * (62 - 24 * t) * t) * decay * 0.68;
    const metal = Math.sin(2 * Math.PI * (390 + 90 * Math.sin(t * 7)) * t) * Math.exp(-t * 8) * 0.18;
    return thud + metal + random() * decay * (t < 0.22 ? 0.44 : 0.1);
  });
}

function consequenceReveal() {
  return samples(1.12, (t) => {
    const chord = [146.83, 174.61, 220].reduce((sum, frequency, index) => sum + Math.sin(2 * Math.PI * frequency * t) * (0.11 - index * 0.018), 0);
    const stamp = Math.sin(2 * Math.PI * 74 * t) * envelope(t, 0.34, 0.58, 1) * 0.58;
    const paper = Math.sin(2 * Math.PI * 2100 * t) * envelope(t, 0.08, 0.36, 1) * 0.12;
    return chord * Math.exp(-t * 2.2) + stamp + paper;
  });
}

function outcomeSuccess() {
  const notes = [392, 494, 587];
  return samples(0.82, (t) => notes.reduce((sum, frequency, index) => {
    const start = index * 0.13;
    return sum + Math.sin(2 * Math.PI * frequency * t) * envelope(t, start, 0.54) * 0.2;
  }, 0));
}

function outcomeSetback() {
  return samples(0.92, (t) => {
    const hit = Math.sin(2 * Math.PI * (84 - 28 * t) * t) * Math.exp(-t * 3) * 0.55;
    const dissonance = (Math.sin(2 * Math.PI * 155 * t) + Math.sin(2 * Math.PI * 164 * t)) * Math.exp(-t * 2.4) * 0.12;
    return hit + dissonance;
  });
}

function fireCrackle() {
  const pops = [
    [0.08, 1480, 0.24], [0.31, 920, 0.19], [0.62, 1750, 0.26],
    [0.91, 1180, 0.2], [1.24, 2010, 0.23], [1.61, 1080, 0.18], [1.91, 1620, 0.2],
  ];
  return samples(2.3, (t) => {
    const emberPulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2.2 * t + 0.4);
    const warmBed = (Math.sin(2 * Math.PI * 73 * t) * 0.11 + Math.sin(2 * Math.PI * 113 * t) * 0.045) * (0.55 + emberPulse * 0.35);
    const crackle = pops.reduce((sum, [start, frequency, volume], index) => {
      const age = t - start;
      if (age < 0 || age > 0.07) return sum;
      const decay = Math.exp(-age * (43 + (index % 3) * 11));
      const spark = Math.sign(Math.sin(2 * Math.PI * frequency * age));
      const click = Math.sin(2 * Math.PI * (frequency * 1.5) * age) * 0.22;
      return sum + (spark * 0.65 + click) * decay * volume;
    }, 0);
    return warmBed + crackle;
  });
}

function ghostArrival() {
  return samples(1.45, (t) => {
    const rise = Math.min(1, t / 0.62);
    const sweep = Math.sin(2 * Math.PI * (110 + rise * 540) * t) * 0.18;
    const low = Math.sin(2 * Math.PI * 47 * t) * 0.26;
    const shimmer = Math.sin(2 * Math.PI * 817 * t) * Math.exp(-Math.max(0, t - 0.78) * 2) * 0.16;
    return (sweep + low) * rise + shimmer;
  });
}

function radioMurmur() {
  const random = noise(77);
  return samples(2.4, (t) => {
    const syllables = Math.max(0, Math.sin(2 * Math.PI * 2.8 * t + Math.sin(t * 2.1))) ** 2;
    const phrase = Math.max(0.14, Math.sin(2 * Math.PI * 0.39 * t + 0.8)) ** 1.7;
    const formants = Math.sin(2 * Math.PI * 310 * t) * 0.34 + Math.sin(2 * Math.PI * 505 * t + 0.4) * 0.27 + Math.sin(2 * Math.PI * 920 * t + 1.1) * 0.16;
    const staticNoise = random() * 0.13 + Math.sin(2 * Math.PI * 3100 * t) * 0.035;
    return (formants * syllables + staticNoise) * phrase;
  });
}

function motorboatStart() {
  const random = noise(903);
  return samples(1.45, (t) => {
    const pulses = Math.sin(2 * Math.PI * (7 + 4 * t) * t);
    const sputter = Math.max(0, pulses) ** 3;
    const pitch = 46 + Math.min(80, Math.max(0, t - 0.62) * 120);
    const starter = Math.exp(-t * 1.2) * (Math.sin(2 * Math.PI * pitch * t) * 0.3 + random() * 0.25);
    const caughtEngine = t > 0.7 ? Math.sin(2 * Math.PI * pitch * t) * sputter * 0.36 : 0;
    return starter + caughtEngine;
  });
}

await mkdir(output, { recursive: true });
const cues = [
  ["ambient-island.wav", ambient()],
  ["menu-theme.wav", menuTheme()],
  ["ui-select.wav", clickSelect()],
  ["decision-open.wav", decisionOpen()],
  ["vote-submit.wav", voteSubmit()],
  ["countdown-tick.wav", countdownTick()],
  ["crash-impact.wav", crashImpact()],
  ["consequence-reveal.wav", consequenceReveal()],
  ["outcome-success.wav", outcomeSuccess()],
  ["outcome-setback.wav", outcomeSetback()],
  ["character-fire.wav", fireCrackle()],
  ["ghost-arrival.wav", ghostArrival()],
  ["crew-radio.wav", radioMurmur()],
  ["motorboat-start.wav", motorboatStart()],
];

for (const [filename, pcm] of cues) await writeWav(filename, pcm);
console.log(`Generated ${cues.length} original game cues in public/audio/cues.`);
