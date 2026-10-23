import { useMemo, useState } from "react";
import type { PublicGameSnapshot } from "../../shared/domain";
import { GameCanvas } from "../../scene/GameCanvas";
import { IslandScene } from "../../scene/phases/IslandScene";
import { toSessionScenePresentation } from "../../scene/sessionPresentation";
import styles from "./SessionIslandView.module.css";
import { getEncounterCameraTarget } from "../../scene/encounterStaging";
import { useGameStore } from "../../client/useGameStore";

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function SessionIslandView({ snapshot, freeCamera = false, sceneLabel, immersive = false }: { snapshot: PublicGameSnapshot; freeCamera?: boolean; sceneLabel?: string; immersive?: boolean }) {
  const [ready, setReady] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const scene = useMemo(() => toSessionScenePresentation(snapshot), [snapshot]);
  const target = useMemo(() => getEncounterCameraTarget(scene.zoneId), [scene.zoneId]);
  const serverClockOffsetMs = useGameStore((state) => state.serverClockOffsetMs ?? 0);

  return <section className={styles.view} aria-label="Live island and crew" data-phase={snapshot.phase} data-history-count={snapshot.eventHistory.length} data-immersive={immersive || undefined}>
    <GameCanvas directed={!freeCamera} zoom={scene.members.length > 4 ? 48 : 64} target={target} onCreated={() => setReady(true)}>
      <IslandScene staging="encounter" serverClockOffsetMs={serverClockOffsetMs} crewMembers={scene.members} zoneId={scene.zoneId} interactionPairCharacterIds={scene.interactionPairCharacterIds} motorboatPresentation={scene.motorboat} />
    </GameCanvas>
    {!ready && <div className={styles.loading} role="status">Loading the island…</div>}
    {!immersive && <div className={styles.missionStrip} aria-live="polite">
      <span className={styles.phase}>{sceneLabel ?? scene.phaseLabel}</span>
      <span className={styles.location}>{scene.zoneName}</span>
    </div>}
    {!immersive && <button className={styles.reportToggle} type="button" aria-expanded={reportOpen} aria-controls="island-crew-report" onClick={() => setReportOpen((open) => !open)}>
      <span>{scene.livingCount} alive</span><span aria-hidden="true">/</span><span>{scene.ghostCount} ghosts</span><strong>{reportOpen ? "Close report" : "Crew report"}</strong>
    </button>}
    {scene.members.length > 0 && (() => {
      const eventSeed = snapshot.eventHistory.at(-1)?.id ?? String(snapshot.decisionNumber);
      const pairIds = scene.interactionPairCharacterIds;
      const speakers = pairIds
        ? pairIds.flatMap((id) => scene.members.find((member) => member.characterId === id && member.status === "alive") ?? [])
        : [];
      const primarySpeaker = scene.members.find(({ behaviorLabel, status }) => Boolean(behaviorLabel) && status === "alive")
        ?? scene.members.find(({ status }) => status === "alive")
        ?? scene.members[stableHash(`${eventSeed}:radio`) % scene.members.length]!;
      const dialogue = speakers.length > 0 ? speakers : [primarySpeaker];
      const speaker = dialogue[0]!;
      return <p className={styles.radioLine} aria-live="polite"><span>Radio:</span> {speaker.playerName}: “{speaker.thoughtLine ?? speaker.reactionLine}”</p>;
    })()}
    {!immersive && reportOpen && <aside className={styles.report} id="island-crew-report" aria-label="Crew condition report">
      <p className={styles.reportTitle}>Crew condition</p>
      <ul>
        {snapshot.characters.map((character) => {
          const definition = snapshot.characterCatalog.find(({ id }) => id === character.characterId);
          if (!definition) return null;
          const condition = character.status === "ghost" ? "Ghost" : character.resources.food === 0 ? "Starving" : "Alive";
          return <li key={character.characterId} data-status={character.status}><span>{definition.displayName}</span><span>{condition} · HP {character.resources.health} · Food {character.resources.food}</span></li>;
        })}
      </ul>
    </aside>}
    {freeCamera && <p className={styles.controls}>Drag orbit · right-drag pan · wheel zoom · WASD / arrows move</p>}
  </section>;
}
