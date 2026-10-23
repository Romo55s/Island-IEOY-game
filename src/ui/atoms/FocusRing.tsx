import type { PropsWithChildren } from "react";
import styles from "./atoms.module.css";
export function FocusRing({ children }: PropsWithChildren) { return <span className={styles.focusFrame}>{children}</span>; }
