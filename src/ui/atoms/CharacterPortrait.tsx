import type { CSSProperties } from "react";
import styles from "./atoms.module.css";

/** Placeholder portrait treatment until approved rendered character portraits are shipped. */
export function CharacterPortrait({ name, tint, state = "available", className = "" }: { name: string; tint: string; state?: "available" | "selected" | "claimed"; className?: string }) {
  const initials = name.split(/\s+/u).map((part) => part[0]).join("").slice(0, 2);
  return <span className={`${styles.portrait} ${className}`} data-state={state} style={{ "--portrait-tint": tint } as CSSProperties} aria-hidden="true">{initials}</span>;
}
