import { Howl, Howler } from "howler";
import { getAudioSettings, subscribeAudioSettings } from "./audioSettings";
import { setMenuScoreGain, startMenuScore, stopMenuScore } from "./menuScore";
import { setDecisionMusicGain, startDecisionMusic, stopDecisionMusic, type DecisionMusicTheme } from "./decisionMusic";
import { setEndingMusicGain, startEndingMusic, stopEndingMusic, type EndingMusicKind } from "./endingMusic";
import { playToneEffect, scheduleCountdownAudio as scheduleToneCountdownAudio, stopToneEffects, TONE_EFFECT_IDS, type ToneEffectId } from "./toneEffects";
import { SOUND_CUES, type SoundCueId } from "./soundCatalog";
import { CHARACTER_VOICES } from "./characterVoices";

const cueById = new Map<SoundCueId, (typeof SOUND_CUES)[number]>(SOUND_CUES.map((cue) => [cue.id, cue] as const));
const sounds = new Map<SoundCueId, Howl>();
const playbackListeners = new Set<() => void>();
let playingSnapshot: ReadonlySet<SoundCueId> = new Set();
let audioUnlocked = false;
let ambientRequested = false;
let menuMusicRequested = false;
let menuMusicPreviewOverride: boolean | null = null;
let decisionMusicRequested = false;
let decisionMusicIntensity = 0;
let decisionMusicTheme: DecisionMusicTheme = "survival";
let endingMusicRequested = false;
let endingMusicKind: EndingMusicKind = "victory";
const activeToneCueCounts = new Map<ToneEffectId, number>();
const toneEffectIdSet = new Set<string>(TONE_EFFECT_IDS);
const unlockListeners = new Set<() => void>();
const voiceSounds = new Map<string, Howl>();
const VOICE_PLAYBACK_GAIN = 0.2;
const voiceListeners = new Set<() => void>();
const voiceBuffers = new Map<string, Promise<AudioBuffer>>();
let playingVoice: string | null = null;
let activeVoice: { sound: Howl; playbackId?: number; cancelLoad: () => void } | undefined;
let activeVoiceBitStop: (() => void) | undefined;
let dialogueVoiceBus: GainNode | undefined;
let dialogueVoiceContext: AudioContext | undefined;

function getDialogueVoiceBus(context: AudioContext): GainNode {
  if (dialogueVoiceBus && dialogueVoiceContext === context) return dialogueVoiceBus;
  dialogueVoiceBus?.disconnect();
  const bus = context.createGain();
  bus.gain.value = getAudioSettings().voices / 100 * VOICE_PLAYBACK_GAIN;
  bus.connect(Howler.masterGain ?? context.destination);
  dialogueVoiceBus = bus;
  dialogueVoiceContext = context;
  return bus;
}

function publishVoice(characterId: string | null): void {
  if (playingVoice === characterId) return;
  playingVoice = characterId;
  voiceListeners.forEach(listener => listener());
}

export function getPlayingVoice(): string | null { return playingVoice; }
export function subscribeVoicePlayback(listener: () => void): () => void {
  voiceListeners.add(listener);
  return () => voiceListeners.delete(listener);
}

export function stopCharacterVoice(): void {
  activeVoiceBitStop?.();
  activeVoiceBitStop = undefined;
  const previous = activeVoice;
  activeVoice = undefined;
  previous?.cancelLoad();
  previous?.sound.stop();
  publishVoice(null);
}

function loadVoiceBuffer(clipId: string): Promise<AudioBuffer> {
  const pending = voiceBuffers.get(clipId);
  if (pending) return pending;
  const voice = Object.values(CHARACTER_VOICES).find(({ clipId: id }) => id === clipId);
  if (!voice || !Howler.ctx) return Promise.reject(new Error("Voice audio is unavailable"));
  const request = fetch(voice.file).then(response => {
    if (!response.ok) throw new Error(`Voice audio returned ${response.status}`);
    return response.arrayBuffer();
  }).then(data => Howler.ctx!.decodeAudioData(data));
  voiceBuffers.set(clipId, request);
  request.catch(() => voiceBuffers.delete(clipId));
  return request;
}

function voicedSlices(buffer: AudioBuffer): Array<{ offset: number; duration: number }> {
  const channel = buffer.getChannelData(0);
  const frame = Math.max(1, Math.floor(buffer.sampleRate * 0.012));
  const candidates: Array<{ offset: number; duration: number; level: number }> = [];
  for (let start = 0; start + frame * 8 < channel.length; start += frame * 3) {
    let sum = 0;
    for (let i = start; i < start + frame * 8; i += 2) sum += channel[i]! * channel[i]!;
    const level = Math.sqrt(sum / (frame * 4));
    if (level > 0.018) candidates.push({ offset: start / buffer.sampleRate, duration: (frame * 8) / buffer.sampleRate, level });
  }
  candidates.sort((a, b) => b.level - a.level);
  return candidates.slice(0, 80).sort((a, b) => a.offset - b.offset).map(({ offset, duration }) => ({ offset, duration }));
}

function textSeed(text: string): number {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Turns a character's recording into short, text-timed retro syllable bips instead of replaying an unrelated sentence. */
export function playCharacterDialogueBits(characterId: string, text: string, durationMs: number): () => void {
  stopCharacterVoice();
  const voice = CHARACTER_VOICES[characterId];
  const context = Howler.ctx;
  if (!voice || !context || !audioUnlocked || !browserSupportsAudio() || document.hidden || durationMs <= 0) return () => {};
  const voiceBus = getDialogueVoiceBus(context);
  const startedAt = performance.now();
  const lease = { sources: new Set<AudioBufferSourceNode>(), nodes: new Set<AudioNode>(), stopped: false };
  let timer: number | undefined;
  let cancel: (() => void) | undefined;
  const stop = () => {
    if (lease.stopped) return;
    lease.stopped = true;
    if (timer !== undefined) window.clearTimeout(timer);
    lease.sources.forEach(source => { try { source.stop(); } catch { /* Already ended. */ } });
    lease.nodes.forEach(node => node.disconnect());
    if (activeVoiceBitStop === cancel) activeVoiceBitStop = undefined;
    if (!activeVoice) publishVoice(null);
  };
  cancel = stop;
  activeVoiceBitStop = cancel;
  publishVoice(characterId);
  void loadVoiceBuffer(voice.clipId).then(buffer => {
    if (lease.stopped || activeVoiceBitStop !== cancel || document.hidden) return;
    const slices = voicedSlices(buffer);
    if (!slices.length) { stop(); return; }
    const crusher = context.createWaveShaper();
    const curve = new Float32Array(2048);
    const steps = 64;
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / (curve.length - 1) - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    crusher.curve = curve;
    const characters = Array.from(text);
    const syllables = characters.flatMap((char, index) => /[aeiouy]/iu.test(char) ? [{ index, char }] : []);
    if (!syllables.length) { stop(); return; }
    const seed = textSeed(`${characterId}:${text}`);
    const lateBy = performance.now() - startedAt;
    const base = context.currentTime + 0.035;
    syllables.forEach(({ index }, syllableIndex) => {
      const slice = slices[(seed + syllableIndex * 17) % slices.length]!;
      const duration = Math.min(slice.duration, 0.09 + ((seed >>> (syllableIndex % 16)) & 3) * 0.01);
      const lineOffset = durationMs * (index / Math.max(1, characters.length));
      if (lineOffset < lateBy - duration) return;
      const when = base + Math.max(0, lineOffset - lateBy) / 1000;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = (voice.pool === "female" ? 1.12 : 0.92) + ((seed >>> (syllableIndex % 12)) & 7) * 0.025;
      source.connect(crusher);
      crusher.connect(gain);
      gain.connect(voiceBus);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(0.62, when + 0.008);
      gain.gain.setValueAtTime(0.62, when + Math.max(0.01, duration - 0.025));
      gain.gain.linearRampToValueAtTime(0.0001, when + duration);
      source.onended = () => { source.disconnect(); gain.disconnect(); lease.sources.delete(source); lease.nodes.delete(gain); };
      lease.sources.add(source);
      lease.nodes.add(gain);
      source.start(when, slice.offset, duration);
      source.stop(when + duration + 0.005);
    });
    lease.nodes.add(crusher);
    timer = window.setTimeout(stop, Math.max(0, durationMs - lateBy) + 160);
  }).catch(() => stop());
  return stop;
}

/** A single voice at a time. Cancel loading as well as playback to prevent stale speech. */
export function playCharacterVoice(characterId: string, loop = false): () => void {
  stopCharacterVoice();
  const voice = CHARACTER_VOICES[characterId];
  if (!voice || !audioUnlocked || !browserSupportsAudio() || document.hidden) return () => {};
  let sound = voiceSounds.get(voice.clipId);
  if (!sound) {
    sound = new Howl({ src: [voice.file], format: ["mp3"], preload: true, volume: 0 });
    voiceSounds.set(voice.clipId, sound);
  }
  const selected = sound;
  const lease = { sound: selected, playbackId: undefined as number | undefined, cancelLoad: () => {} };
  activeVoice = lease;
  const finish = () => { if (activeVoice === lease) stopCharacterVoice(); };
  const started = () => { if (activeVoice === lease) publishVoice(characterId); };
  const start = () => {
    if (activeVoice !== lease || document.hidden) return;
    selected.loop(loop);
    selected.volume(getAudioSettings().voices / 100 * VOICE_PLAYBACK_GAIN);
    selected.once("play", started);
    selected.once("playerror", finish);
    if (!loop) selected.once("end", finish);
    lease.playbackId = selected.play();
  };
  lease.cancelLoad = () => {
    selected.off("load", start); selected.off("loaderror", finish);
    selected.off("play", started); selected.off("playerror", finish); selected.off("end", finish);
  };
  selected.once("loaderror", finish);
  if (selected.state() === "loaded") start();
  else {
    selected.once("load", start);
    if (selected.state() === "unloaded") selected.load();
  }
  return () => { if (activeVoice === lease) stopCharacterVoice(); };
}

function cueVolume(cue: (typeof SOUND_CUES)[number]): number {
  const settings = getAudioSettings();
  const channel = cue.channel === "music" && settings.musicMuted ? 0 : settings[cue.channel];
  return cue.gain * channel / 100;
}

function browserSupportsAudio(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const element = document.createElement("audio");
  return Boolean(element.canPlayType("audio/wav") || "AudioContext" in window || "webkitAudioContext" in window);
}

function publishPlaying(id: SoundCueId, isPlaying: boolean): void {
  const next = new Set(playingSnapshot);
  if (isPlaying) next.add(id);
  else next.delete(id);
  if (next.size === playingSnapshot.size && [...next].every((value) => playingSnapshot.has(value))) return;
  playingSnapshot = next;
  playbackListeners.forEach((listener) => listener());
}

function getSound(id: SoundCueId): Howl {
  const existing = sounds.get(id);
  if (existing) return existing;
  const cue = cueById.get(id);
  if (!cue) throw new Error(`Unknown sound cue: ${id}`);
  const sound = new Howl({
    src: [("file" in cue && cue.file) || `/audio/cues/${id}.wav`],
    format: [("format" in cue && cue.format) || "wav"],
    loop: cue.loop,
    preload: true,
    volume: cueVolume(cue),
    onloaderror: () => publishPlaying(id, false),
    onplay: () => publishPlaying(id, true),
    onpause: () => publishPlaying(id, false),
    onstop: () => publishPlaying(id, false),
    onend: () => publishPlaying(id, false),
  });
  sounds.set(id, sound);
  return sound;
}

function applyVolumes(): void {
  const settings = getAudioSettings();
  const music = settings.musicMuted ? 0 : settings.music;
  Howler.volume(settings.master / 100);
  if (dialogueVoiceBus) {
    const now = dialogueVoiceBus.context.currentTime;
    dialogueVoiceBus.gain.cancelScheduledValues(now);
    dialogueVoiceBus.gain.setTargetAtTime(settings.voices / 100 * VOICE_PLAYBACK_GAIN, now, 0.025);
  }
  activeVoice?.sound.volume(settings.voices / 100 * VOICE_PLAYBACK_GAIN);
  setMenuScoreGain((settings.master / 100) * (music / 100) * 0.9);
  setDecisionMusicGain((settings.master / 100) * (music / 100) * 0.52);
  setEndingMusicGain((settings.master / 100) * (music / 100) * 0.56);
  for (const [id, sound] of sounds) {
    const cue = cueById.get(id)!;
    sound.volume(cueVolume(cue));
  }
}

subscribeAudioSettings(applyVolumes);
applyVolumes();

export function unlockAudio(): void {
  if (!browserSupportsAudio()) return;
  const wasUnlocked = audioUnlocked;
  audioUnlocked = true;
  if (!wasUnlocked) unlockListeners.forEach((listener) => listener());
  if (Howler.ctx?.state === "suspended") void Howler.ctx.resume().catch(() => undefined);
  if (ambientRequested) startAmbientNow();
  resumeMusicPriority();
}

export function playSound(id: SoundCueId): void {
  if (!audioUnlocked || !browserSupportsAudio()) return;
  if (toneEffectIdSet.has(id)) {
    const effectId = id as ToneEffectId;
    const cue = cueById.get(effectId)!;
    const settings = getAudioSettings();
    void playToneEffect(effectId, cue.gain * settings.master / 100 * settings.effects / 100, () => {
      activeToneCueCounts.set(effectId, (activeToneCueCounts.get(effectId) ?? 0) + 1);
      publishPlaying(effectId, true);
    }, () => {
      const remaining = (activeToneCueCounts.get(effectId) ?? 1) - 1;
      if (remaining <= 0) {
        activeToneCueCounts.delete(effectId);
        publishPlaying(effectId, false);
      } else {
        activeToneCueCounts.set(effectId, remaining);
      }
    }).catch(() => {
      if (!activeToneCueCounts.has(effectId)) publishPlaying(effectId, false);
    });
    return;
  }
  const sound = getSound(id);
  sound.volume(cueVolume(cueById.get(id)!));
  if (!cueById.get(id)!.loop) sound.stop();
  sound.play();
  if (ambientRequested && id !== "ambient-island") startAmbientNow();
}

export function scheduleCountdownAudio(deadline: number, now: () => number, tickGain: number, expiredGain: number): Promise<() => void> {
  return scheduleToneCountdownAudio(deadline, now, tickGain, expiredGain);
}

export function stopSound(id: SoundCueId): void {
  if (toneEffectIdSet.has(id)) {
    stopToneEffects(id as ToneEffectId);
    activeToneCueCounts.delete(id as ToneEffectId);
    publishPlaying(id, false);
  }
  sounds.get(id)?.stop();
  if (id === "ambient-island") ambientRequested = false;
}

export function requestIslandAmbience(enabled: boolean): void {
  ambientRequested = enabled;
  if (enabled) {
    if (audioUnlocked) startAmbientNow();
  } else {
    sounds.get("ambient-island")?.stop();
  }
}

export function requestMenuMusic(enabled: boolean): void {
  menuMusicRequested = enabled;
  if (enabled) startMenuMusicNow();
  else stopMenuScore();
}

export function requestMenuMusicPreview(enabled: boolean | null): void {
  menuMusicPreviewOverride = enabled;
  if (enabled === false) stopMenuScore();
  else startMenuMusicNow();
}

export function requestDecisionMusic(enabled: boolean, intensity = 0, theme: DecisionMusicTheme = "survival"): void {
  decisionMusicRequested = enabled;
  if (!enabled) {
    stopDecisionMusic();
    if (!endingMusicRequested) startMenuMusicNow();
    return;
  }
  decisionMusicIntensity = intensity;
  decisionMusicTheme = theme;
  stopMenuScore();
  if (endingMusicRequested) return;
  if (audioUnlocked) startDecisionMusic(theme, intensity);
}

export function requestEndingMusic(enabled: boolean, kind: EndingMusicKind = "victory"): void {
  endingMusicRequested = enabled;
  if (!enabled) {
    stopEndingMusic();
    if (decisionMusicRequested) {
      if (audioUnlocked) startDecisionMusic(decisionMusicTheme, decisionMusicIntensity);
    } else startMenuMusicNow();
    return;
  }
  endingMusicKind = kind;
  stopMenuScore();
  stopDecisionMusic();
  if (audioUnlocked) startEndingMusic(kind);
}

function resumeMusicPriority(): void {
  if (endingMusicRequested) startEndingMusic(endingMusicKind);
  else if (decisionMusicRequested) startDecisionMusic(decisionMusicTheme, decisionMusicIntensity);
  else startMenuMusicNow();
}

function startAmbientNow(): void {
  if (!ambientRequested) return;
  const ambient = getSound("ambient-island");
  if (!ambient.playing()) {
    ambient.volume(cueVolume(cueById.get("ambient-island")!));
    ambient.play();
  }
}

function startMenuMusicNow(): void {
  if (!audioUnlocked || endingMusicRequested || decisionMusicRequested) return;
  if (!(menuMusicPreviewOverride ?? menuMusicRequested)) return;
  void startMenuScore().catch(() => undefined);
}

export function stopAllSounds(): void {
  stopCharacterVoice();
  ambientRequested = false;
  menuMusicRequested = false;
  menuMusicPreviewOverride = null;
  decisionMusicRequested = false;
  endingMusicRequested = false;
  stopMenuScore();
  stopDecisionMusic();
  stopEndingMusic();
  stopToneEffects();
  activeToneCueCounts.clear();
  TONE_EFFECT_IDS.forEach((id) => publishPlaying(id, false));
  for (const sound of sounds.values()) sound.stop();
}

export function getPlayingSounds(): ReadonlySet<SoundCueId> { return playingSnapshot; }

export function subscribeSoundPlayback(listener: () => void): () => void {
  playbackListeners.add(listener);
  return () => playbackListeners.delete(listener);
}

export function isAudioUnlocked(): boolean { return audioUnlocked; }

export function subscribeAudioUnlocked(listener: () => void): () => void {
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopCharacterVoice(); });
  window.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
  window.addEventListener("keydown", unlockAudio, { once: true, capture: true });
}
