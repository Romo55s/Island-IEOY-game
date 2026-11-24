import { useMemo } from "react";
import { Skull } from "pixelarticons/react/Skull.js";
import { Fish } from "pixelarticons/react/Fish.js";
import { Heart } from "pixelarticons/react/Heart.js";
import { Smile } from "pixelarticons/react/Smile.js";
import { Waves } from "pixelarticons/react/Waves.js";
import type { CharacterDefinition, CharacterState, Player } from "../../shared/domain";
import type { SessionSceneMember } from "../../scene/sessionPresentation";
import { CharacterPortrait } from "../atoms/CharacterPortrait";
import { PlayerRow } from "../molecules/PlayerRow";
import styles from "./organisms.module.css";

export function AnimatedCrewPortraits({ players, members, enabled, characterCatalog, characterStates = [], compact = false, onInspect }: {
  players: Player[];
  members: SessionSceneMember[];
  enabled: boolean;
  characterCatalog: CharacterDefinition[];
  characterStates?: CharacterState[];
  compact?: boolean;
  onInspect?: (playerId: string) => void;
}) {
  const memberByPlayer = useMemo(() => new Map(members.map((member) => [member.playerId, member])), [members]);
  return <div className={styles.portraitStage} data-animated={enabled || undefined}>
    {players.map((player) => {
      const member = memberByPlayer.get(player.id);
      const dead = member?.status === "ghost" || player.status === "ghost";
      const character = characterStates.find(({ characterId }) => characterId === player.characterId);
      const definition = characterCatalog.find(({ id }) => id === player.characterId);
      const values = character ? [
        { id: "health", label: "Health", value: character.resources.health, Icon: Heart },
        { id: "food", label: "Food", value: character.resources.food, Icon: Fish },
        { id: "morale", label: "Morale", value: character.resources.morale, Icon: Smile },
        { id: "water", label: "Water", value: character.resources.water, Icon: Waves },
      ] : [];
      const inspectLabel = definition ? `Inspect ${definition.displayName}, ${dead ? "ghost" : "alive"}; open crew status` : `Inspect ${player.displayName}`;
      return <button type="button" className={styles.manifestIdentity} key={player.id} aria-label={inspectLabel} onClick={() => onInspect?.(player.id)}>
        <div className={styles.manifestTopline}>
          <div className={styles.portraitWindow} role="img" aria-label={dead ? `${player.displayName}, dead` : `${player.displayName}, animated character portrait`}>
            {dead ? <Skull className={styles.deadSkull} aria-hidden="true" /> : definition
              ? <CharacterPortrait name={definition.displayName} tint={member?.tint ?? definition.tint} characterId={player.characterId ?? undefined} modelUrl={definition.modelUrl} animationName={enabled && member ? member.animationName : "idle"} animationEventId={member?.animationEventId ?? `manifest:${player.characterId}`} />
              : <span aria-hidden="true">{player.displayName.slice(0, 2).toUpperCase()}</span>}
          </div>
          <div className={styles.manifestPlayer}><PlayerRow player={player} characterName={definition?.displayName} compact={compact} /></div>
        </div>
        {values.length > 0 && <div className={styles.manifestStats} role="group" aria-label={`${definition?.displayName ?? "Survivor"} condition`}>
          {values.map(({ id, label, value, Icon }) => <span className={styles.resourceGlyph} key={id} data-resource={id} data-low={value <= 25} role="img" aria-label={`${label}: ${value}%`} title={`${label}: ${value}%`}>
            <Icon aria-hidden="true" />
            <span className={styles.resourcePips} aria-hidden="true">{[0, 1, 2, 3].map((pip) => <i key={pip} data-filled={value > pip * 25 || undefined} />)}</span>
          </span>)}
        </div>}
      </button>;
    })}
  </div>;
}
