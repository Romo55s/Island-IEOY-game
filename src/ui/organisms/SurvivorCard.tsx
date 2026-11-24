import type { CharacterDefinition } from "../../shared/domain";
import { playSound, unlockAudio } from "../../audio/audioSystem";
import { CharacterPortrait } from "../atoms/CharacterPortrait";
import styles from "./organisms.module.css";

export function SurvivorCard({ character, state, onSelect }: { character: CharacterDefinition; state: "available" | "selected" | "claimed"; onSelect: () => void }) {
  const disabled = state === "claimed";
  const stateLabel = state === "selected" ? "Your survivor" : state === "claimed" ? "Claimed by another survivor" : "Available";
  return <button type="button" className={styles.survivorCard} data-state={state} disabled={disabled} aria-label={`${character.displayName}: ${stateLabel}`} aria-pressed={state === "selected"} onClick={() => { unlockAudio(); playSound("library-ui-select"); onSelect(); }}>
    <CharacterPortrait name={character.displayName} tint={character.tint} state={state} characterId={character.id} modelUrl={character.modelUrl} />
    <span className={styles.survivorCopy}><strong>{character.displayName}</strong><small>{state === "selected" ? "Your survivor" : state === "claimed" ? "Claimed" : "Available"}</small></span>
    <i style={{ background: character.tint }} aria-hidden="true" />
  </button>;
}
