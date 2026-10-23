import type { HTMLAttributes } from "react";
import styles from "./atoms.module.css";
export function PixelLabel({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={`${styles.label} ${className}`} {...props} />; }
