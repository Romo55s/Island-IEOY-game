import type { HTMLAttributes } from "react";
import styles from "./atoms.module.css";
type Props = HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "positive" | "warning" | "critical" };
export function StatusBadge({ tone = "default", className = "", ...props }: Props) { return <span className={`${styles.badge} ${styles[tone]} ${className}`} {...props} />; }
