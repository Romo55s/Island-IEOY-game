import { useState } from "react";
import { GameCanvas } from "../../scene/GameCanvas";
import { IslandScene } from "../../scene/phases/IslandScene";
import { StatusBadge } from "../../ui/atoms/StatusBadge";
import { CHARACTER_CATALOG } from "../../shared/domain";
import { CharacterStatusPanel } from "../../ui/organisms/CharacterStatusPanel";
import styles from "./IslandSandboxScreen.module.css";

const crew = CHARACTER_CATALOG.map(({ displayName }) => displayName);
const demoItems = Object.fromEntries(CHARACTER_CATALOG.slice(0, 3).map((character, index) => [character.id, ["guitar", "knife", "apple"][index]! ]));
const demoCharacters = CHARACTER_CATALOG.map((character, index) => ({
  characterId: character.id,
  status: "alive" as const,
  resources: {
    health: 68 + ((index * 13) % 31),
    food: 38 + ((index * 17) % 43),
    morale: 42 + ((index * 19) % 48),
    water: 44 + ((index * 11) % 47),
  },
}));

export function IslandSandboxScreen({ title }: { title: string }) {
  const [sceneReady, setSceneReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  return (
    <main className={styles.screen}>
      <div className={styles.world}>
        <GameCanvas key={retryKey} onCreated={() => setSceneReady(true)}>
          <IslandScene crew={crew} startingItemsByCharacter={demoItems} />
        </GameCanvas>
        {!sceneReady && <div className={styles.loading} aria-live="polite">Waking up on the island…</div>}
        <header className={styles.topHud}>
          <div className={styles.heading}>
            <p className={styles.flight}>FLIGHT 404 · BLACK BOX 01</p>
            <h1>{title}</h1>
          </div>
          <div className={styles.status}><StatusBadge tone="warning">SANDBOX</StatusBadge><span>Day 01 / 10</span></div>
        </header>
        <CharacterStatusPanel characters={demoCharacters} catalog={CHARACTER_CATALOG} sharedResources={{ shelter: 28 }} />
        <div className={styles.bottomHud}>
          <div className={styles.castNote}>
            <span className={styles.signal} aria-hidden="true" />
            <div><strong>Crash beach · 8 survivors</strong><span>Left-drag orbit · right-drag pan · wheel zoom · WASD / arrows move</span></div>
          </div>
          <button className={styles.retry} type="button" onClick={() => { setSceneReady(false); setRetryKey((key) => key + 1); }}>
            Reset view
          </button>
        </div>
        <div className={styles.edgeMark} aria-hidden="true">NO CONTROLS · ALL DECISIONS ARE GROUP DECISIONS</div>
      </div>
    </main>
  );
}
