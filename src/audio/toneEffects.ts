export const TONE_EFFECT_IDS = [
  "ui-select",
  "decision-open",
  "vote-submit",
  "countdown-tick",
  "countdown-expired",
  "consequence-reveal",
  "outcome-success",
  "outcome-setback",
  "ghost-arrival",
] as const;

export type ToneEffectId = (typeof TONE_EFFECT_IDS)[number];

let toneModule: typeof import("tone") | null = null;

type EffectHandle = { cancel: () => void };
const activeEffects = new Map<ToneEffectId, Set<EffectHandle>>();

function trackEffect(id: ToneEffectId, handle: EffectHandle): void {
  const current = activeEffects.get(id) ?? new Set<EffectHandle>();
  current.add(handle);
  activeEffects.set(id, current);
}

function untrackEffect(id: ToneEffectId, handle: EffectHandle): void {
  const current = activeEffects.get(id);
  current?.delete(handle);
  if (current?.size === 0) activeEffects.delete(id);
}

/**
 * Short Tone.js one-shots use the menu score's D-minor palette and a shared,
 * restrained synth family. Material Foley remains in the licensed library or
 * the existing rendered assets; this layer handles musical/UI punctuation.
 */
export async function playToneEffect(
  id: ToneEffectId,
  gain: number,
  onStart: () => void,
  onEnd: () => void,
): Promise<EffectHandle> {
  const Tone = toneModule ?? await import("tone");
  toneModule = Tone;
  await Tone.start();

  const output = new Tone.Gain(Math.max(0, Math.min(0.8, gain))).toDestination();
  const dispose: Array<() => void> = [() => output.dispose()];
  const now = Tone.now();
  let duration = 0.3;
  const poly = (volume = -13) => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.008, decay: 0.12, sustain: 0.08, release: 0.16 },
    });
    synth.volume.value = volume;
    synth.connect(output);
    dispose.push(() => synth.dispose());
    return synth;
  };
  const membrane = (volume = -15) => {
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.035,
      octaves: 3,
      oscillator: { type: "sine" },
      envelope: { attack: 0.002, decay: 0.16, sustain: 0, release: 0.025 },
    });
    synth.volume.value = volume;
    synth.connect(output);
    dispose.push(() => synth.dispose());
    return synth;
  };
  const metal = (volume = -22) => {
    const synth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.055, release: 0.01 },
      harmonicity: 4.1,
      modulationIndex: 18,
      resonance: 3200,
      octaves: 1.2,
    });
    synth.frequency.value = 1400;
    synth.volume.value = volume;
    synth.connect(output);
    dispose.push(() => synth.dispose());
    return synth;
  };

  switch (id) {
    case "ui-select": {
      const synth = poly(-15);
      synth.triggerAttackRelease("D5", "32n", now, 0.52);
      synth.triggerAttackRelease("A5", "32n", now + 0.055, 0.42);
      duration = 0.18;
      break;
    }
    case "decision-open": {
      const synth = poly(-14);
      synth.triggerAttackRelease("D5", "16n", now, 0.5);
      synth.triggerAttackRelease("F5", "16n", now + 0.11, 0.43);
      synth.triggerAttackRelease("Eb5", "16n", now + 0.22, 0.38);
      synth.triggerAttackRelease("D5", "8n", now + 0.33, 0.45);
      duration = 0.64;
      break;
    }
    case "vote-submit": {
      const synth = poly(-16);
      synth.triggerAttackRelease("A4", "16n", now, 0.38);
      synth.triggerAttackRelease("D5", "8n", now + 0.09, 0.46);
      duration = 0.34;
      break;
    }
    case "countdown-tick": {
      const click = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.001, decay: 0.018, sustain: 0, release: 0.004 },
      });
      click.volume.value = -20;
      const filter = new Tone.Filter({ frequency: 1500, type: "lowpass", rolloff: -12 });
      click.connect(filter);
      filter.connect(output);
      dispose.push(() => click.dispose(), () => filter.dispose());
      click.triggerAttackRelease(0.035, now, 0.34);
      duration = 0.08;
      break;
    }
    case "countdown-expired": {
      const signal = poly(-15);
      signal.triggerAttackRelease("A4", "16n", now, 0.48);
      signal.triggerAttackRelease("D4", "4n", now + 0.15, 0.42);
      membrane(-16).triggerAttackRelease("D2", "8n", now + 0.06, 0.32);
      duration = 0.62;
      break;
    }
    case "consequence-reveal": {
      const chord = poly(-20);
      chord.triggerAttackRelease(["D4", "F4", "Eb5"], "4n", now + 0.07, 0.32);
      membrane(-10).triggerAttackRelease("D2", "8n", now + 0.28, 0.45);
      metal(-31).triggerAttackRelease("16n", now + 0.3, 0.35);
      duration = 0.92;
      break;
    }
    case "outcome-success": {
      const relief = poly(-15);
      relief.triggerAttackRelease("D4", "16n", now, 0.42);
      relief.triggerAttackRelease("F4", "16n", now + 0.12, 0.42);
      relief.triggerAttackRelease("A4", "8n", now + 0.24, 0.46);
      relief.triggerAttackRelease("D5", "4n", now + 0.4, 0.4);
      duration = 0.92;
      break;
    }
    case "outcome-setback": {
      const fall = poly(-13);
      fall.triggerAttackRelease("D4", "16n", now, 0.44);
      fall.triggerAttackRelease("C#4", "16n", now + 0.13, 0.42);
      fall.triggerAttackRelease("A3", "4n", now + 0.27, 0.39);
      membrane(-12).triggerAttackRelease("A1", "8n", now + 0.29, 0.38);
      duration = 0.91;
      break;
    }
    case "ghost-arrival": {
      const shimmer = poly(-19);
      shimmer.triggerAttackRelease("D4", "8n", now, 0.32);
      shimmer.triggerAttackRelease("A4", "8n", now + 0.16, 0.3);
      shimmer.triggerAttackRelease("D5", "4n", now + 0.34, 0.28);
      metal(-32).triggerAttackRelease("8n", now + 0.39, 0.26);
      duration = 0.94;
      break;
    }
  }

  let timer = 0;
  const handle: EffectHandle = {
    cancel: () => {
      window.clearTimeout(timer);
      output.gain.rampTo(0, 0.025);
      window.setTimeout(() => dispose.forEach((release) => release()), 40);
      untrackEffect(id, handle);
      onEnd();
    },
  };
  trackEffect(id, handle);
  onStart();
  timer = window.setTimeout(handle.cancel, (duration + 0.14) * 1000);
  return handle;
}

/** Schedule one clock's complete tick pattern on the Web Audio timeline. */
export async function scheduleCountdownAudio(
  deadline: number,
  now: () => number,
  tickGain: number,
  expiredGain: number,
): Promise<() => void> {
  const Tone = toneModule ?? await import("tone");
  toneModule = Tone;
  await Tone.start();

  const wallStart = now();
  const remainingMs = deadline - wallStart;
  if (remainingMs <= 0) return () => undefined;

  const contextStart = Tone.getContext().rawContext.currentTime;
  const rawContext = Tone.getContext().rawContext;
  const latencyContext = rawContext as unknown as { outputLatency?: number; baseLatency?: number };
  // Schedule against the same deadline as the digits, compensating for the
  // browser's known output delay so the click reaches the speakers on that beat.
  const outputDelaySeconds = Math.max(0, latencyContext.outputLatency ?? latencyContext.baseLatency ?? 0);
  const timeForWallClock = (wallTime: number) => contextStart + Math.max(0, wallTime - wallStart) / 1000 - outputDelaySeconds;
  const tickBus = new Tone.Gain(Math.max(0, Math.min(0.8, tickGain))).toDestination();
  const expiredBus = new Tone.Gain(Math.max(0, Math.min(0.8, expiredGain))).toDestination();
  const tickNoise = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 0.001, decay: 0.018, sustain: 0, release: 0.004 },
  });
  tickNoise.volume.value = -20;
  const tickFilter = new Tone.Filter({ frequency: 1500, type: "lowpass", rolloff: -12 });
  tickNoise.connect(tickFilter);
  tickFilter.connect(tickBus);

  const secondsRemaining = Math.ceil(remainingMs / 1000);
  for (let shownSeconds = secondsRemaining - 1; shownSeconds > 0; shownSeconds -= 1) {
    const boundary = deadline - shownSeconds * 1000;
    if (boundary <= wallStart) continue;
    const at = timeForWallClock(boundary);
    tickNoise.triggerAttackRelease(0.035, at, 0.34);
  }

  const expiredAt = timeForWallClock(deadline);
  const alarm = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.004, decay: 0.14, sustain: 0.08, release: 0.18 },
  });
  alarm.volume.value = -15;
  alarm.connect(expiredBus);
  alarm.triggerAttackRelease("A4", "16n", expiredAt, 0.48);
  alarm.triggerAttackRelease("D4", "4n", expiredAt + 0.15, 0.42);
  const thud = new Tone.MembraneSynth({
    pitchDecay: 0.025,
    octaves: 1.2,
    oscillator: { type: "sine" },
    envelope: { attack: 0.002, decay: 0.2, sustain: 0, release: 0.03 },
  });
  thud.volume.value = -16;
  thud.connect(expiredBus);
  thud.triggerAttackRelease("D2", "8n", expiredAt + 0.05, 0.32);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    tickNoise.dispose();
    tickFilter.dispose();
    alarm.dispose();
    thud.dispose();
    tickBus.dispose();
    expiredBus.dispose();
  };

  return () => {
    if (disposed) return;
    // Let an imminent time-up cue finish if the server closes the phase on the same boundary.
    if (deadline - now() <= 250) window.setTimeout(dispose, 750);
    else dispose();
  };
}

export function stopToneEffects(id?: ToneEffectId): void {
  const effects = id ? [activeEffects.get(id)] : [...activeEffects.values()];
  effects.forEach((handles) => handles?.forEach((handle) => handle.cancel()));
}
