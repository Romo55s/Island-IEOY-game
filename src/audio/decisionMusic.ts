import { ISLAND_AFTER_IMPACT_HARMONY, ISLAND_AFTER_IMPACT_MOTIF } from "./islandTheme";

export type DecisionMusicTheme = "survival" | "signal" | "escape";

const SAMPLE_ROOT = "/audio/instruments/meta-piano/INSPiano_Vel03_";
const pianoSamples: Record<string, string> = {
  C2: `${SAMPLE_ROOT}C2_01.ogg`, F2: `${SAMPLE_ROOT}F2_01.ogg`, A2: `${SAMPLE_ROOT}A2_01.ogg`,
  C3: `${SAMPLE_ROOT}C3_01.ogg`, F3: `${SAMPLE_ROOT}F3_01.ogg`, A3: `${SAMPLE_ROOT}A3_01.ogg`,
  C4: `${SAMPLE_ROOT}C4_01.ogg`, Eb4: `${SAMPLE_ROOT}Ds4_01.ogg`, G4: `${SAMPLE_ROOT}G4_01.ogg`,
  Bb4: `${SAMPLE_ROOT}As4_01.ogg`, D5: `${SAMPLE_ROOT}D5_01.ogg`, F5: `${SAMPLE_ROOT}F5_01.ogg`,
  A5: `${SAMPLE_ROOT}A5_01.ogg`, C6: `${SAMPLE_ROOT}C6_01.ogg`, E6: `${SAMPLE_ROOT}E6_01.ogg`,
};

const survivalRoots = ["D2", "Bb1", "C2", "A1"];
const survivalFigures = [
  ["D4", "-", "-", "-", "F4", "-", "-", "-"],
  ["-", "-", "Eb4", "-", "-", "-", "D4", "-"],
  ["D4", "-", "-", "-", "C4", "-", "-", "-"],
  ["-", "-", "Bb3", "-", "-", "-", "A3", "-"],
];
const signalCalls = [
  [ISLAND_AFTER_IMPACT_MOTIF[0], "-", ISLAND_AFTER_IMPACT_MOTIF[1], "-", ISLAND_AFTER_IMPACT_MOTIF[2], "-", ISLAND_AFTER_IMPACT_MOTIF[3], "-"],
  ["A5", "-", "-", "D6", "-", "-", "A5", "-"],
  ["D6", "-", "F6", "-", "Eb6", "-", "D6", "-"],
  ["A5", "-", "-", "D6", "-", "-", "-", "-"],
];
const styles: Record<DecisionMusicTheme, { bpm: number }> = {
  survival: { bpm: 54 },
  signal: { bpm: 108 },
  escape: { bpm: 142 },
};

let toneModule: typeof import("tone") | null = null;
let output: import("tone").Gain | null = null;
let piano: import("tone").Sampler | null = null;
let initPromise: Promise<void> | null = null;
let stepTimer = 0;
let requested = false;
let playing = false;
let step = 0;
let intensity = 0;
let theme: DecisionMusicTheme = "survival";
let targetGain = 0.16;

async function ensureNodes(): Promise<void> {
  const Tone = toneModule ?? await import("tone");
  toneModule = Tone;
  await Tone.start();
  if (output && piano?.loaded) return;
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve, reject) => {
    output = new Tone.Gain(0).toDestination();
    piano = new Tone.Sampler({
      urls: pianoSamples,
      attack: 0.006,
      release: 1.25,
      onload: () => resolve(),
      onerror: (error) => reject(error),
    });
    piano.volume.value = -1.5;
    piano.connect(output!);
  }).catch((error) => {
    piano?.dispose();
    output?.dispose();
    piano = null;
    output = null;
    initPromise = null;
    throw error;
  });

  return initPromise;
}

function play(note: string, duration: number, time: number, velocity: number): void {
  if (!piano || note === "-") return;
  piano.triggerAttackRelease(note, duration, time, velocity);
}

function scheduleStep(): void {
  if (!playing || !toneModule || !piano) return;
  const bar = Math.floor(step / 8) % 4;
  const beat = step % 8;
  const now = toneModule.now() + 0.025;
  const eighth = 60 / styles[theme].bpm / 2;

  if (theme === "survival") {
    if (beat === 0) play(survivalRoots[bar]!, eighth * 3.5, now, 0.44);
    const figureNote = survivalFigures[bar]![beat]!;
    if (figureNote !== "-") {
      play(figureNote, eighth * (beat === 0 ? 1.6 : 1.15), now, intensity > 1 ? 0.48 : intensity > 0 ? 0.34 : 0.25);
    }
    if (intensity > 1 && beat === 6) play("C5", eighth * 0.7, now, 0.24);
  }

  if (theme === "signal") {
    if (beat === 0) {
      const signalBass = ["D3", "Bb2", "C3", "A2"][bar]!;
      const openFifth = [["A3", "D4"], ["F3", "Bb3"], ["G3", "C4"], ["E3", "A3"]][bar]!;
      play(signalBass, eighth * 3.8, now, 0.3);
      piano?.triggerAttackRelease(openFifth, eighth * 3.2, now, 0.22);
    }
    const call = signalCalls[bar]![beat]!;
    if (call !== "-") play(call, eighth * (beat === 0 || beat === 4 ? 1.5 : 0.85), now, beat === 0 ? 0.5 : 0.38);
    if (intensity > 0 && beat === 7) play("A5", eighth * 0.45, now, 0.2);
  }

  if (theme === "escape") {
    const bassPulse = ["D2", "A2", "D2", "A2", "Bb1", "F2", "A1", "E2"][beat]!;
    const chaseLine = ["D5", "F5", "Eb5", "D5", "A4", "D5", "F5", "Eb5"][beat]!;
    play(bassPulse, eighth * 0.42, now, beat % 2 === 0 ? 0.38 : 0.24);
    play(chaseLine, eighth * (beat === 3 ? 0.45 : 0.62), now, beat < 4 ? 0.34 : intensity > 0 ? 0.3 : 0.2);
    if (beat === 0 || beat === 4) {
      const chord = ISLAND_AFTER_IMPACT_HARMONY[(bar + (beat === 4 ? 2 : 0)) % 8]!;
      piano?.triggerAttackRelease([chord[2]!, chord[4]!], eighth * 0.65, now, 0.15);
    }
  }

  step = (step + 1) % 32;
  stepTimer = window.setTimeout(scheduleStep, eighth * 1000);
}

export function setDecisionMusicGain(gain: number): void {
  targetGain = Math.max(0, Math.min(0.45, gain));
  if (output) output.gain.rampTo(playing ? targetGain : 0, 0.22);
}

export function startDecisionMusic(nextTheme: DecisionMusicTheme, nextIntensity: number): void {
  requested = true;
  theme = nextTheme;
  intensity = Math.max(0, Math.min(2, Math.floor(nextIntensity)));
  if (playing) return;

  void ensureNodes().then(() => {
    if (!requested || playing) return;
    playing = true;
    step = 0;
    output?.gain.rampTo(targetGain, 0.45);
    scheduleStep();
  }).catch(() => {
    requested = false;
  });
}

export function stopDecisionMusic(): void {
  requested = false;
  playing = false;
  window.clearTimeout(stepTimer);
  output?.gain.rampTo(0, 0.2);
  // Keep the decoded local samples warm so later game phases don't pause to reload them.
}
