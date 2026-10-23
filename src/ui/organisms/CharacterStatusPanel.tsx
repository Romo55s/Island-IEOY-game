import type { CSSProperties } from "react";
import { Fish } from "pixelarticons/react/Fish.js";
import { Heart } from "pixelarticons/react/Heart.js";
import { Smile } from "pixelarticons/react/Smile.js";
import { Waves } from "pixelarticons/react/Waves.js";
import type { CharacterDefinition, CharacterResources, CharacterState, Resources } from "../../shared/domain";
import styles from "./characterStatus.module.css";

const labels: Array<{ key: keyof CharacterResources; label: string }> = [
  { key: "health", label: "Health" },
  { key: "food", label: "Food" },
  { key: "morale", label: "Morale" },
  { key: "water", label: "Water" },
];

function PixelStatIcon({ type }: { type: keyof CharacterResources }) {
  const color = type === "health" ? "#c54f42" : type === "food" ? "#b58b32" : type === "morale" ? "#6f9f62" : "#4d93b6";
  const icons = {
    health: Heart,
    food: Fish,
    morale: Smile,
    water: Waves,
  };
  const Icon = icons[type];
  return <Icon className={styles.icon} style={{ color }} aria-hidden="true" />;
}

export function CharacterStatusPanel({ characters, catalog, sharedResources }: {
  characters: CharacterState[];
  catalog: CharacterDefinition[];
  sharedResources: Resources;
}) {
  const definitions = new Map(catalog.map((character) => [character.id, character]));
  return (
    <aside className={styles.panel} aria-label="Crew status">
      <header className={styles.heading}><strong>CREW STATUS</strong><span>{characters.length} / 8</span></header>
      <div className={styles.roster}>
        {characters.map((character) => {
          const definition = definitions.get(character.characterId);
          if (!definition) return null;
          const initials = definition.displayName.split(/\s+/u).map((part) => part[0]).join("").slice(0, 2);
          return (
            <article className={styles.person} key={character.characterId} data-status={character.status}>
              <div className={styles.personHead}>
                <span className={styles.portrait} style={{ "--portrait-tint": definition.tint } as CSSProperties} aria-hidden="true">
                  <span>{initials}</span>
                </span>
                <strong>{definition.displayName}</strong>
                {character.status === "ghost" && <span className={styles.ghost}>GHOST</span>}
              </div>
              <div className={styles.stats}>
                {labels.map(({ key, label }) => {
                  const value = character.resources[key];
                  return <span className={styles.stat} data-low={value <= 25} key={key} aria-label={`${definition.displayName} ${label}: ${value}`} title={`${label}: ${value}`}><PixelStatIcon type={key} /><b>{value}</b></span>;
                })}
              </div>
            </article>
          );
        })}
      </div>
      <div className={styles.shared}>
        <span>SHARED · SHELTER</span><b>{sharedResources.shelter}%</b>
        <div className={styles.track} aria-hidden="true"><i style={{ width: `${sharedResources.shelter}%` }} /></div>
      </div>
    </aside>
  );
}
