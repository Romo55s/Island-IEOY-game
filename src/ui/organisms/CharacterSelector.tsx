import { CHARACTER_CATALOG } from "../../shared/domain";
import { SurvivorCard } from "./SurvivorCard";
import styles from "./organisms.module.css";
export function CharacterSelector({ selectedId, claimedIds = [], onSelect = () => {}, layout = "default" }: { selectedId?: string; claimedIds?: string[]; onSelect?: (id: string) => void; layout?: "default" | "lobby" }) {
  const lobby = layout === "lobby";
  return <section className={`${styles.characterSelector} ${lobby ? styles.lobbyCharacterSelector : ""}`} aria-labelledby="character-title"><h2 className={styles.heading} id="character-title">Choose a survivor</h2><div className={`${styles.characters} ${lobby ? styles.lobbyCharacters : ""}`}>{CHARACTER_CATALOG.map((character) => { const claimed = claimedIds.includes(character.id) && selectedId !== character.id; const state = selectedId === character.id ? "selected" : claimed ? "claimed" : "available"; return <SurvivorCard key={character.id} character={character} state={state} variant={layout} onSelect={() => onSelect(character.id)} />; })}</div></section>;
}
