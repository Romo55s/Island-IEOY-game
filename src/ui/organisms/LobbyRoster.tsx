import type { Player } from "../../shared/domain";
import { CHARACTER_CATALOG } from "../../shared/domain";
import { PlayerRow } from "../molecules/PlayerRow";
import styles from "./organisms.module.css";
export function LobbyRoster({ players }: { players: Player[] }) { return <section className={styles.roster} aria-labelledby="roster-title"><h2 className={styles.heading} id="roster-title">Passenger manifest</h2>{players.map((player) => <PlayerRow key={player.id} player={player} characterName={CHARACTER_CATALOG.find(({ id }) => id === player.characterId)?.displayName} />)}</section>; }
