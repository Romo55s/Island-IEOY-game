import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { playSound, unlockAudio } from "../../audio/audioSystem";
import styles from "./atoms.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "primary" | "danger"; "data-sfx"?: "none" | "ui-select" };
export function RetroButton({ tone = "default", className = "", onClick, "data-sfx": soundCue = "ui-select", ...props }: Props) {
  return <button className={`${styles.button} ${styles[tone]} ${className}`} onClick={(event) => {
    if (soundCue !== "none") { unlockAudio(); playSound("library-ui-select"); }
    onClick?.(event);
  }} {...props} />;
}

/** Canonical navigation control. Use this instead of one-off back-link styling. */
export function BackButton({ children = "Back", className = "", onClick, "data-sfx": soundCue = "ui-select", ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode; "data-sfx"?: "none" | "ui-select" }) {
  return <a className={`${styles.button} ${styles.backButton} ${className}`} onClick={(event) => {
    if (soundCue !== "none") { unlockAudio(); playSound("library-ui-select"); }
    onClick?.(event);
  }} {...props}>
    <span className={styles.backArrow} aria-hidden="true">←</span>
    <span>{children}</span>
  </a>;
}
