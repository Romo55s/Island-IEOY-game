import { useSyncExternalStore } from "react";

export type AudioChannel = "master" | "music" | "effects" | "voices";
export interface AudioSettings { master: number; music: number; effects: number; voices: number; musicMuted: boolean }

const STORAGE_KEY = "ieoy-audio-settings-v5";
const LEGACY_STORAGE_KEYS = ["ieoy-audio-settings-v4", "ieoy-audio-settings-v3", "ieoy-audio-settings-v2", "ieoy-audio-settings-v1"] as const;
const DEFAULT_SETTINGS: AudioSettings = { master: 70, music: 10, effects: 80, voices: 10, musicMuted: false };
const listeners = new Set<() => void>();

function readSettings(): AudioSettings {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const migrating = current === null;
    const previous = LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find((value) => value !== null);
    const saved = JSON.parse(current ?? previous ?? "null") as Partial<AudioSettings> | null;
    if (!saved) return DEFAULT_SETTINGS;
    const next = {
      master: clamp(saved.master, DEFAULT_SETTINGS.master),
      music: migrating ? DEFAULT_SETTINGS.music : clamp(saved.music, DEFAULT_SETTINGS.music),
      effects: clamp(saved.effects, DEFAULT_SETTINGS.effects),
      voices: migrating ? DEFAULT_SETTINGS.voices : clamp(saved.voices, DEFAULT_SETTINGS.voices),
      musicMuted: typeof saved.musicMuted === "boolean" ? saved.musicMuted : DEFAULT_SETTINGS.musicMuted,
    };
    if (migrating) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function clamp(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;
}

let settings = readSettings();

export function getAudioSettings(): AudioSettings { return settings; }

export function subscribeAudioSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAudioSetting(channel: AudioChannel, value: number): void {
  const next = { ...settings, [channel]: clamp(value, settings[channel]) };
  if (next[channel] === settings[channel]) return;
  settings = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Settings still work for this page session. */ }
  listeners.forEach((listener) => listener());
}

export function setMusicMuted(muted: boolean): void {
  if (settings.musicMuted === muted) return;
  settings = { ...settings, musicMuted: muted };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Settings still work for this page session. */ }
  listeners.forEach((listener) => listener());
}

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(subscribeAudioSettings, getAudioSettings, () => DEFAULT_SETTINGS);
}
