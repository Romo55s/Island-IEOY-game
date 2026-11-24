import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { isAudioUnlocked, scheduleCountdownAudio, subscribeAudioUnlocked } from "../../audio/audioSystem";
import { useAudioSettings } from "../../audio/audioSettings";
import { PixelLabel } from "../atoms/PixelLabel";
import styles from "./molecules.module.css";

type CountdownMode = "vote" | "choice" | "reading";
function thresholdMessage(seconds: number, mode: CountdownMode) { if (seconds <= 0) return mode === "vote" ? "Voting closed" : mode === "reading" ? "Voting opens" : "Choice window closed"; if (seconds === 5) return "Five seconds remaining"; if (seconds === 10) return "Ten seconds remaining"; return ""; }
const localNow = () => Date.now();
export function Countdown({ deadline, now = localNow, mode = "vote" }: { deadline: number; now?: () => number; mode?: CountdownMode }) {
  const getSeconds = () => Math.max(0, Math.ceil((deadline - now()) / 1000));
  const [seconds, setSeconds] = useState(getSeconds);
  const nowRef = useRef(now);
  nowRef.current = now;
  const audioUnlocked = useSyncExternalStore(subscribeAudioUnlocked, isAudioUnlocked, () => false);
  const audioSettings = useAudioSettings();
  useEffect(() => {
    let timeout = 0;
    const getCurrentSeconds = () => Math.max(0, Math.ceil((deadline - nowRef.current()) / 1000));
    const initial = getCurrentSeconds();
    setSeconds(initial);

    const updateAtSecondBoundary = () => {
      const next = getCurrentSeconds();
      setSeconds(next);

      if (next > 0) {
        const remainingMs = deadline - nowRef.current();
        const untilNextSecond = remainingMs - (next - 1) * 1000;
        timeout = window.setTimeout(updateAtSecondBoundary, Math.max(1, untilNextSecond));
      }
    };

    updateAtSecondBoundary();
    return () => window.clearTimeout(timeout);
  }, [deadline, mode, now]);
  useEffect(() => {
    if (mode === "reading" || !audioUnlocked) return;
    let active = true;
    let cancel: (() => void) | undefined;
    const effectGain = (audioSettings.master / 100) * (audioSettings.effects / 100);
    void scheduleCountdownAudio(
      deadline,
      () => nowRef.current(),
      effectGain * 0.12,
      effectGain * 0.42,
    ).then((stop) => {
      if (!active) stop();
      else cancel = stop;
    }).catch(() => undefined);
    return () => {
      active = false;
      cancel?.();
    };
  }, [audioSettings.effects, audioSettings.master, audioUnlocked, deadline, mode, now]);
  const announcement = useMemo(() => thresholdMessage(seconds, mode), [mode, seconds]);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return <div className={styles.countdown}><PixelLabel>{mode === "vote" ? "Vote clock" : mode === "reading" ? "Voting opens" : "Choice clock"}</PixelLabel><span className={styles.time}>{String(minutes).padStart(2, "0")}:{String(remainder).padStart(2, "0")}</span><span className="sr-only" aria-live="polite">{announcement}</span></div>;
}
