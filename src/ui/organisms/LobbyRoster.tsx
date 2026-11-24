import type { CharacterState, Player } from "../../shared/domain";
import { CHARACTER_CATALOG } from "../../shared/domain";
import type { SessionSceneMember } from "../../scene/sessionPresentation";
import { AnimatedCrewPortraits } from "./AnimatedCrewPortraits";
import styles from "./organisms.module.css";
export function LobbyRoster({ players, characterCatalog = CHARACTER_CATALOG, characterStates = [], compact = false, portraitMembers = [], animatedPortraits = false, onInspect }: { players: Player[]; characterCatalog?: typeof CHARACTER_CATALOG; characterStates?: CharacterState[]; compact?: boolean; portraitMembers?: SessionSceneMember[]; animatedPortraits?: boolean; onInspect?: (playerId: string) => void }) {
  return <section className={styles.roster} aria-label="Passenger list">
    <AnimatedCrewPortraits players={players} members={portraitMembers} enabled={animatedPortraits} characterCatalog={characterCatalog} characterStates={characterStates} compact={compact} onInspect={onInspect} />
  </section>;
}
