import type { ButtonHTMLAttributes } from "react";
import styles from "./molecules.module.css";
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { index: 1 | 2 | 3; label: string; selected?: boolean; submitted?: boolean; rejected?: boolean };
export function VoteOption({ index, label, selected = false, submitted = false, rejected = false, ...props }: Props) {
  return <button className={styles.vote} type="button" data-option={index} data-selected={selected} data-submitted={submitted} data-rejected={rejected} aria-pressed={selected} aria-describedby={rejected ? `vote-${index}-error` : undefined} {...props}><span className={styles.key} aria-hidden="true">{index}</span><span>{label}</span>{rejected ? <small id={`vote-${index}-error`}>Rejected</small> : null}</button>;
}
