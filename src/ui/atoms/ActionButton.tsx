import type { ButtonHTMLAttributes } from "react";
import { RetroButton } from "./RetroButton";

/** Canonical actionable control for persistent session actions. */
export function ActionButton({ tone = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "primary" | "danger" }) {
  return <RetroButton tone={tone} {...props} />;
}
