import type { ButtonHTMLAttributes } from "react";
import styles from "./atoms.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "primary" | "danger" };
export function RetroButton({ tone = "default", className = "", ...props }: Props) {
  return <button className={`${styles.button} ${styles[tone]} ${className}`} {...props} />;
}
