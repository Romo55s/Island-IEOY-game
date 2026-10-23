import styles from "./molecules.module.css";
export function ConnectionBanner({ state, className = "" }: { state: "connected" | "reconnecting" | "failed" | "expired"; className?: string }) {
  const copy = { connected: "Connected to the black box", reconnecting: "Signal lost. Reconnecting…", failed: "Connection failed. Try again.", expired: "This session has expired." }[state];
  return <div className={`${styles.banner} ${className}`} data-state={state} role={state === "connected" ? "status" : "alert"}><span aria-hidden="true">{state === "connected" ? "●" : "▲"}</span>{copy}</div>;
}
