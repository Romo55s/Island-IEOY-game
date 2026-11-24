import styles from "./molecules.module.css";
export function ConnectionBanner({ state, className = "", onRetry }: { state: "connected" | "reconnecting" | "failed" | "expired"; className?: string; onRetry?: () => void }) {
  const copy = { connected: "Connected to the black box", reconnecting: "Signal lost. Reconnecting…", failed: "Connection failed. Try again.", expired: "This session has expired." }[state];
  return <div className={`${styles.banner} ${className}`} data-state={state} role={state === "connected" ? "status" : "alert"}><span aria-hidden="true">{state === "connected" ? "●" : "▲"}</span><span>{copy}</span>{state === "failed" && onRetry && <button type="button" className={styles.retryButton} onClick={onRetry}>Reconnect</button>}</div>;
}
