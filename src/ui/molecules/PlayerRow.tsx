import type { Player } from "../../shared/domain";
import { StatusBadge } from "../atoms/StatusBadge";
import styles from "./molecules.module.css";
export function PlayerRow({ player, characterName, compact = false }: { player: Player; characterName?: string; compact?: boolean }) {
  const status = !player.connected ? "disconnected" : player.status;
  return <div className={`${styles.player} ${compact ? styles.playerCompact : ""}`}><span className={styles.playerName}>{player.displayName}{characterName ? ` as ${characterName}` : " — choosing"}</span><StatusBadge className={compact ? styles.playerBadge : ""} tone={status === "alive" ? "positive" : status === "ghost" ? "warning" : "critical"}>{status}</StatusBadge></div>;
}
