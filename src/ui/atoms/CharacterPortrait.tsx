import type { CSSProperties } from "react";
import { CharacterModelPortrait } from "./CharacterModelPortrait";
import styles from "./atoms.module.css";

export function CharacterPortrait({ name, tint, state = "available", className = "", characterId, modelUrl, animationName, animationOnce = false, animationHoldAtEnd = false, animationEventId }: { name: string; tint: string; state?: "available" | "selected" | "claimed"; className?: string; characterId?: string; modelUrl?: string; animationName?: string; animationOnce?: boolean; animationHoldAtEnd?: boolean; animationEventId?: string }) {
  const initials = name.split(/\s+/u).map((part) => part[0]).join("").slice(0, 2);
  const staticPortraitsForE2E = typeof window !== "undefined" && Boolean((window as Window & { __IEOY_E2E_STATIC_PORTRAITS__?: boolean }).__IEOY_E2E_STATIC_PORTRAITS__);
  return <span className={`${styles.portrait} ${className}`} data-state={state} style={{ "--portrait-tint": tint } as CSSProperties} aria-hidden="true">
    <span className={styles.portraitInitials}>{initials}</span>
    {modelUrl && !staticPortraitsForE2E && <CharacterModelPortrait characterId={characterId} modelUrl={modelUrl} tint={tint} animationName={animationName} animationOnce={animationOnce} animationHoldAtEnd={animationHoldAtEnd} animationEventId={animationEventId} />}
  </span>;
}
