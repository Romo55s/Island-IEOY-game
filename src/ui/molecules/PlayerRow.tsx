import type { Player } from "../../shared/domain";
import { StatusBadge } from "../atoms/StatusBadge";
import styles from "./molecules.module.css";
export function PlayerRow({ player, characterName }: { player: Player; characterName?: string }) {
  const status = !player.connected ? "disconnected" : player.status;
  return <div className={styles.player}><span className={styles.playerName}>{player.displayName}{characterName ? ` as ${characterName}` : " — choosing"}</span><StatusBadge tone={status === "alive" ? "positive" : status === "ghost" ? "warning" : "critical"}>{status}</StatusBadge></div>;
}
