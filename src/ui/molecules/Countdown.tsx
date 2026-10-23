import { useEffect, useMemo, useState } from "react";
import { PixelLabel } from "../atoms/PixelLabel";
import styles from "./molecules.module.css";

type CountdownMode = "vote" | "choice" | "reading";
function thresholdMessage(seconds: number, mode: CountdownMode) { if (seconds <= 0) return mode === "vote" ? "Voting closed" : mode === "reading" ? "Voting opens" : "Choice window closed"; if (seconds === 5) return "Five seconds remaining"; if (seconds === 10) return "Ten seconds remaining"; return ""; }
const localNow = () => Date.now();
export function Countdown({ deadline, now = localNow, mode = "vote" }: { deadline: number; now?: () => number; mode?: CountdownMode }) {
  const getSeconds = () => Math.max(0, Math.ceil((deadline - now()) / 1000));
  const [seconds, setSeconds] = useState(getSeconds);
  useEffect(() => { setSeconds(getSeconds()); const timer = window.setInterval(() => setSeconds(getSeconds()), 250); return () => window.clearInterval(timer); }, [deadline, now]);
  const announcement = useMemo(() => thresholdMessage(seconds, mode), [mode, seconds]);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return <div className={styles.countdown}><PixelLabel>{mode === "vote" ? "Vote clock" : mode === "reading" ? "Voting opens" : "Choice clock"}</PixelLabel><span className={styles.time}>{String(minutes).padStart(2, "0")}:{String(remainder).padStart(2, "0")}</span><span className="sr-only" aria-live="polite">{announcement}</span></div>;
}
