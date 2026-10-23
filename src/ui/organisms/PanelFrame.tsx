import type { ReactNode } from "react";
import styles from "./organisms.module.css";

/** Shared black-box metal frame. Aged paper is reserved for reports inside it. */
export function PanelFrame({ title, index, children, className = "", as: Tag = "section" }: { title: string; index?: string; children: ReactNode; className?: string; as?: "section" | "aside" }) {
  return <Tag className={`${styles.panelFrame} ${className}`}>
    <header className={styles.panelRibbon}>{index && <span>{index}</span>}<h2>{title}</h2></header>
    <div className={styles.panelInset}>{children}</div>
  </Tag>;
}
