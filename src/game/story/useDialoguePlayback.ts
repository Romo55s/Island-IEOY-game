import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { CrewDialogueExchange } from "../../shared/domain";
import { isAudioUnlocked, playCharacterDialogueBits, subscribeAudioUnlocked } from "../../audio/audioSystem";
import { dialogueFrame, timeDialogue } from "./dialoguePlayback";

export function useDialoguePlayback(exchange?: CrewDialogueExchange) {
  const key = exchange ? JSON.stringify([exchange.id, exchange.lines]) : "";
  // Snapshots replace object identities frequently. Only changed dialogue resets its clock.
  const timeline = useMemo(() => timeDialogue(exchange?.lines ?? []), [key]);
  const [clock, setClock] = useState({ key, elapsed: 0 });
  const [skippedKey, setSkippedKey] = useState<string>();
  const [reducedMotion, setReducedMotion] = useState(() => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const unlocked = useSyncExternalStore(subscribeAudioUnlocked, isAudioUnlocked, () => false);
  const skipped = skippedKey === key;
  const elapsed = clock.key === key ? clock.elapsed : 0;
  const frame = dialogueFrame(timeline, elapsed, skipped);
  const activeCharacterId = timeline[frame.activeIndex]?.line.characterId;

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query?.matches ?? false);
    query?.addEventListener("change", update);
    return () => query?.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    const start = performance.now();
    setClock({ key, elapsed: 0 });
    if (!key) return;
    const duration = timeline.at(-1)?.end ?? 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      setClock({ key, elapsed });
      if (elapsed >= duration) window.clearInterval(timer);
    };
    const timer = window.setInterval(tick, 32);
    return () => window.clearInterval(timer);
  }, [key, timeline]);
  useEffect(() => {
    if (!unlocked || !visible || !activeCharacterId || skipped) return;
    const current = timeline[frame.activeIndex];
    return current ? playCharacterDialogueBits(activeCharacterId, current.line.text, current.end - current.start) : undefined;
  }, [key, frame.activeIndex, activeCharacterId, unlocked, visible, skipped, timeline]);

  return { ...frame, reducedMotion, visibleText: reducedMotion ? timeline.map(({ line }) => line.text) : frame.visibleText,
    skip: () => setSkippedKey(key), activeCharacterId, key };
}
