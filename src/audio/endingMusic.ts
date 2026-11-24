import { ISLAND_AFTER_IMPACT_BASS, ISLAND_AFTER_IMPACT_HARMONY } from "./islandTheme";

export type EndingMusicKind = "victory" | "defeat";

const SAMPLE_ROOT = "/audio/instruments/meta-piano/INSPiano_Vel03_";
const pianoSamples: Record<string, string> = {
  C2: `${SAMPLE_ROOT}C2_01.ogg`, F2: `${SAMPLE_ROOT}F2_01.ogg`, A2: `${SAMPLE_ROOT}A2_01.ogg`,
  C3: `${SAMPLE_ROOT}C3_01.ogg`, F3: `${SAMPLE_ROOT}F3_01.ogg`, A3: `${SAMPLE_ROOT}A3_01.ogg`,
  C4: `${SAMPLE_ROOT}C4_01.ogg`, Eb4: `${SAMPLE_ROOT}Ds4_01.ogg`, G4: `${SAMPLE_ROOT}G4_01.ogg`,
  Bb4: `${SAMPLE_ROOT}As4_01.ogg`, D5: `${SAMPLE_ROOT}D5_01.ogg`, F5: `${SAMPLE_ROOT}F5_01.ogg`,
  A5: `${SAMPLE_ROOT}A5_01.ogg`, C6: `${SAMPLE_ROOT}C6_01.ogg`, E6: `${SAMPLE_ROOT}E6_01.ogg`,
};

const victoryProgression = [
  ["D3", "A3", "D4", "F#4"], ["G3", "D4", "G4", "B4"],
  ["A2", "E3", "A3", "C#4"], ["D3", "A3", "D4", "F#4"],
];
const victoryMotif = ["D5", "F#5", "E5", "D5"];
const defeatBars = [0, 1, 2, 7] as const;
const defeatFigures = [
  ["D4", "-", "-", "F4", "-", "Eb4", "-", "D4"],
  ["Bb3", "-", "-", "D4", "-", "C4", "-", "Bb3"],
  ["C4", "-", "-", "Eb4", "-", "D4", "-", "C4"],
  ["A3", "-", "-", "C#4", "-", "Bb3", "-", "A3"],
];

let toneModule: typeof import("tone") | null = null;
let output: import("tone").Gain | null = null;
let piano: import("tone").Sampler | null = null;
let initPromise: Promise<void> | null = null;
let stepTimer = 0;
let position = 0;
let kind: EndingMusicKind = "victory";
let requested = false;
let playing = false;
let targetGain = 0.16;

async function buildNodes(): Promise<void> {
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
      release: 1.8,
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

function note(value: string, duration: number, time: number, velocity: number): void {
  if (!piano || value === "-") return;
  piano.triggerAttackRelease(value, duration, time, velocity);
}

function scheduleStep(): void {
  if (!playing || !toneModule || !piano) return;
  const bar = Math.floor(position / 8) % 4;
  const beat = position % 8;
  const now = toneModule.now() + 0.025;

  if (kind === "victory") {
    const eighth = 60 / 112 / 2;
    const motifNote = beat % 2 === 0 ? victoryMotif[beat / 2]! : null;
    if (beat === 0) {
      note("D2", eighth * 3.4, now, 0.4);
      piano.triggerAttackRelease(victoryProgression[bar]!, eighth * 1.4, now, 0.34);
    }
    if (motifNote) note(motifNote, eighth * 0.8, now, 0.52);
    if (beat === 4) {
      note(["A4", "B4", "C#5", "A4"][bar]!, eighth * 0.75, now, 0.3);
      piano.triggerAttackRelease(["D4", "A4"], eighth * 0.8, now, 0.22);
    }
    stepTimer = window.setTimeout(scheduleStep, eighth * 1000);
  } else {
    const eighth = 60 / 42 / 2;
    const phraseNote = defeatFigures[bar]![beat]!;
    const harmonyBar = defeatBars[bar]!;
    if (beat === 0) {
      note(ISLAND_AFTER_IMPACT_BASS[harmonyBar]!, eighth * 7.4, now, 0.48);
      const chord = ISLAND_AFTER_IMPACT_HARMONY[harmonyBar]!;
      piano.triggerAttackRelease([chord[0]!, chord[2]!, chord[4]!], eighth * 5.2, now, 0.24);
    }
    if (phraseNote !== "-") note(phraseNote, eighth * 2.2, now, 0.29);
    stepTimer = window.setTimeout(scheduleStep, eighth * 1000);
  }

  position = (position + 1) % 32;
}

export function setEndingMusicGain(gain: number): void {
  targetGain = Math.max(0, Math.min(0.4, gain));
  if (output && playing) output.gain.rampTo(targetGain, 0.3);
}

export function startEndingMusic(nextKind: EndingMusicKind): void {
  kind = nextKind;
  requested = true;
  if (playing) return;

  void buildNodes().then(() => {
    if (!requested || playing) return;
    playing = true;
    position = 0;
    output?.gain.rampTo(targetGain, 0.8);
    scheduleStep();
  }).catch(() => {
    requested = false;
  });
}

export function stopEndingMusic(): void {
  requested = false;
  playing = false;
  window.clearTimeout(stepTimer);
  output?.gain.rampTo(0, 0.35);
  // Keep the decoded local samples warm so later game phases don't pause to reload them.
}
