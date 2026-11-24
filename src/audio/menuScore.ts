import { ISLAND_AFTER_IMPACT_HARMONY, ISLAND_AFTER_IMPACT_MOTIF } from "./islandTheme";

type ChordEvent = { time: string; notes: string[]; duration: string; velocity: number };
type NoteEvent = { time: string; note: string; duration: string; velocity: number };
type BassEvent = NoteEvent;

let toneApi: typeof import("tone") | null = null;
let requested = false;
let playing = false;
let starting: Promise<void> | null = null;
let output: import("tone").Gain | null = null;
let pad: import("tone").PolySynth<import("tone").Synth> | null = null;
let bass: import("tone").MonoSynth | null = null;
let lead: import("tone").Synth | null = null;
let parts: import("tone").Part[] = [];
let reverb: import("tone").Reverb | null = null;
let chorus: import("tone").Chorus | null = null;
let delay: import("tone").FeedbackDelay | null = null;
let targetGain = 0.35;

/**
 * Title cue: 76 BPM, 4/4, eight bars (about 25.3 seconds), D minor with a
 * single Eb-to-D color note. The first four bars state a four-note falling
 * motif; bars 5-7 widen and answer it; bar 8 holds an A7(b9) suspension into
 * the D-minor return. Soft synth layers are intentionally instrumental-like
 * approximations, with no drum loop or constant broadband noise.
 */
function buildScore(): void {
  if (output) return;
  const Tone = toneApi;
  if (!Tone) return;

  const transport = Tone.getTransport();
  transport.bpm.value = 76;
  transport.timeSignature = 4;
  transport.loop = true;
  transport.loopStart = "0:0:0";
  transport.loopEnd = "8:0:0";

  output = new Tone.Gain(targetGain).toDestination();
  reverb = new Tone.Reverb({ decay: 2.8, preDelay: 0.035, wet: 0.23 });
  chorus = new Tone.Chorus({ frequency: 0.16, delayTime: 9, depth: 0.14, wet: 0.15 }).start();
  delay = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.12, wet: 0.12 });
  chorus.connect(reverb);
  delay.connect(reverb);
  reverb.connect(output);

  pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.75, decay: 0.5, sustain: 0.55, release: 1.15 },
  });
  pad.volume.value = -12;
  pad.connect(chorus);

  bass = new Tone.MonoSynth({
    oscillator: { type: "triangle" },
    filter: { type: "lowpass", frequency: 310, Q: 0.65 },
    envelope: { attack: 0.07, decay: 0.32, sustain: 0.34, release: 0.55 },
    filterEnvelope: { attack: 0.08, decay: 0.25, sustain: 0.12, release: 0.35, baseFrequency: 120, octaves: 1.5 },
  });
  bass.volume.value = -9;
  bass.connect(output);

  lead = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.035, decay: 0.32, sustain: 0.18, release: 0.72 },
  });
  lead.volume.value = -13;
  lead.connect(delay);

  const chords: ChordEvent[] = [
    ...ISLAND_AFTER_IMPACT_HARMONY.map((notes, bar) => ({
      time: `${bar}:0`, notes: [...notes], duration: "1m", velocity: [0.58, 0.52, 0.5, 0.5, 0.54, 0.52, 0.56, 0.48][bar]!,
    })),
  ];
  const bassNotes: BassEvent[] = [
    { time: "0:0", note: "D2", duration: "4n", velocity: 0.54 }, { time: "0:2", note: "A2", duration: "4n", velocity: 0.38 },
    { time: "1:0", note: "D2", duration: "4n", velocity: 0.54 }, { time: "1:2", note: "A2", duration: "4n", velocity: 0.38 },
    { time: "2:0", note: "Bb1", duration: "4n", velocity: 0.54 }, { time: "2:2", note: "F2", duration: "4n", velocity: 0.38 },
    { time: "3:0", note: "C2", duration: "4n", velocity: 0.54 }, { time: "3:2", note: "G2", duration: "4n", velocity: 0.38 },
    { time: "4:0", note: "G1", duration: "4n", velocity: 0.54 }, { time: "4:2", note: "D2", duration: "4n", velocity: 0.38 },
    { time: "5:0", note: "D2", duration: "4n", velocity: 0.54 }, { time: "5:2", note: "A2", duration: "4n", velocity: 0.38 },
    { time: "6:0", note: "Bb1", duration: "4n", velocity: 0.54 }, { time: "6:2", note: "F2", duration: "4n", velocity: 0.38 },
    { time: "7:0", note: "A1", duration: "4n", velocity: 0.54 }, { time: "7:2", note: "E2", duration: "4n", velocity: 0.38 },
  ];
  const melody: NoteEvent[] = [
    ["0:0:2", ISLAND_AFTER_IMPACT_MOTIF[0], "4n", 0.62], ["0:1:2", ISLAND_AFTER_IMPACT_MOTIF[1], "4n", 0.48], ["0:2:2", ISLAND_AFTER_IMPACT_MOTIF[2], "4n", 0.42], ["0:3", ISLAND_AFTER_IMPACT_MOTIF[3], "4n.", 0.56],
    ["1:1", "A4", "2n", 0.42], ["1:3", "C5", "4n", 0.38],
    ["2:0:2", "D5", "4n", 0.45], ["2:2", "F5", "4n", 0.42], ["2:3", "A4", "4n", 0.34],
    ["3:1", "G4", "2n", 0.38], ["3:3", "F4", "4n", 0.34],
    ["4:0:2", "D5", "4n", 0.55], ["4:1:2", "F5", "4n", 0.48], ["4:2:2", "G5", "4n", 0.38], ["4:3", "Eb5", "4n.", 0.42],
    ["5:1", "D5", "2n", 0.5], ["5:3", "C5", "4n", 0.38],
    ["6:0:2", "Bb4", "4n", 0.35], ["6:2", "D5", "2n", 0.5],
    ["7:1", "C#5", "4n", 0.34], ["7:2:2", "Bb4", "4n", 0.3],
  ].map(([time, note, duration, velocity]) => ({ time: String(time), note: String(note), duration: String(duration), velocity: Number(velocity) }));

  parts = [
    new Tone.Part<ChordEvent>((time, event) => pad?.triggerAttackRelease(event.notes, event.duration, time, event.velocity), chords).start(0),
    new Tone.Part<BassEvent>((time, event) => bass?.triggerAttackRelease(event.note, event.duration, time, event.velocity), bassNotes).start(0),
    new Tone.Part<NoteEvent>((time, event) => lead?.triggerAttackRelease(event.note, event.duration, time, event.velocity), melody).start(0),
  ];
}

export function setMenuScoreGain(gain: number): void {
  targetGain = Math.max(0, Math.min(0.9, gain));
  if (output) output.gain.rampTo(targetGain, 0.16);
}

export function startMenuScore(): Promise<void> {
  requested = true;
  if (playing) return Promise.resolve();
  if (starting) return starting;

  starting = (async () => {
    const Tone = await import("tone");
    toneApi = Tone;
    await Tone.start();
    if (!requested) return;
    buildScore();
    await reverb?.ready;
    if (!requested) return;
    setMenuScoreGain(targetGain);
    Tone.getTransport().position = "0:0:0";
    Tone.getTransport().start("+0.04");
    playing = true;
  })().catch((error: unknown) => {
    requested = false;
    throw error;
  }).finally(() => {
    starting = null;
  });

  return starting;
}

export function stopMenuScore(): void {
  requested = false;
  const Tone = toneApi;
  if (!Tone) return;
  if (playing) {
    Tone.getTransport().stop();
    Tone.getTransport().position = "0:0:0";
    pad?.releaseAll();
    bass?.triggerRelease();
    lead?.triggerRelease();
    output?.gain.rampTo(0, 0.12);
    playing = false;
  }
}

export function disposeMenuScore(): void {
  stopMenuScore();
  parts.forEach((part) => part.dispose());
  pad?.dispose();
  bass?.dispose();
  lead?.dispose();
  chorus?.dispose();
  delay?.dispose();
  reverb?.dispose();
  output?.dispose();
  parts = [];
  pad = null;
  bass = null;
  lead = null;
  chorus = null;
  delay = null;
  reverb = null;
  output = null;
}
