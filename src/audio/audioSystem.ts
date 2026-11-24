import { Howl, Howler } from "howler";
import { getAudioSettings, subscribeAudioSettings } from "./audioSettings";
import { setMenuScoreGain, startMenuScore, stopMenuScore } from "./menuScore";
import { setDecisionMusicGain, startDecisionMusic, stopDecisionMusic, type DecisionMusicTheme } from "./decisionMusic";
import { setEndingMusicGain, startEndingMusic, stopEndingMusic, type EndingMusicKind } from "./endingMusic";
import { playToneEffect, scheduleCountdownAudio as scheduleToneCountdownAudio, stopToneEffects, TONE_EFFECT_IDS, type ToneEffectId } from "./toneEffects";
import { SOUND_CUES, type SoundCueId } from "./soundCatalog";

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
  window.addEventListener("pointerdown", unlockAudio, { once: true, capture: true });
  window.addEventListener("keydown", unlockAudio, { once: true, capture: true });
}
