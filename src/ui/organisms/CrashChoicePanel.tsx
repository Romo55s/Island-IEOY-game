import { useCallback, useEffect, useState } from "react";
import { CHARACTER_CATALOG, type CharacterDefinition, type CharacterState, type CrashResolution, type Player } from "../../shared/domain";
import { SURVIVAL_ITEMS } from "../../shared/content/items";
import { CHARACTER_PROFILES } from "../../shared/content/characterProfiles";
import { rescueRiskLabel } from "../../shared/rules/crashRescue";
import { Countdown } from "../molecules/Countdown";
import styles from "./crashChoice.module.css";

export interface CrashChoicePanelProps {
  phase: "crashItemChoice" | "crashRescueChoice" | "crashResolution";
  deadline: number | null;
  serverClockOffsetMs?: number | null;
  itemOffer?: string[];
  selectedItemId?: string;
  selectedTargetCharacterId?: string;
  viewerCharacterId: string | null;
  players: Player[];
  characters: CharacterState[];
  characterCatalog: CharacterDefinition[];
  resolution?: CrashResolution;
  onSubmitItem(itemId: string): void;
  onSubmitRescue(targetCharacterId: string): void;
}

export function CrashChoicePanel(props: CrashChoicePanelProps) {
  const now = useCallback(() => Date.now() + (props.serverClockOffsetMs ?? 0), [props.serverClockOffsetMs]);
  if (props.phase === "crashResolution") return props.resolution ? <CrashReport resolution={props.resolution} characters={props.characters} catalog={props.characterCatalog} /> : null;
  const deadline = props.deadline;
  return <section className={styles.panel} aria-labelledby="crash-choice-title">
    <header className={styles.header}>
      <div><p className={styles.kicker}>FLIGHT 404 · EMERGENCY PROCEDURE</p><h2 id="crash-choice-title">{props.phase === "crashItemChoice" ? "Choose what you carried out" : "Who do you try to save?"}</h2></div>
      {deadline !== null && <Countdown deadline={deadline} now={now} mode="choice" />}
    </header>
    {props.phase === "crashItemChoice" ? <ItemChoice {...props} /> : <RescueChoice {...props} />}
  </section>;
}

function ItemChoice({ itemOffer = [], selectedItemId, onSubmitItem }: CrashChoicePanelProps) {
  return <>
    <p className={styles.instructions}>Three items were pulled from the shared island-survival pool. Pick one for your character; everyone else has their own draw.</p>
    <div className={styles.itemGrid} role="group" aria-label="Choose one starting item">
      {itemOffer.map((id, index) => {
        const item = SURVIVAL_ITEMS.find((candidate) => candidate.id === id);
        if (!item) return null;
        const selected = selectedItemId === item.id;
        return <button key={item.id} type="button" className={styles.choice} data-selected={selected} aria-pressed={selected} onClick={() => onSubmitItem(item.id)}>
          <span className={styles.number}>0{index + 1}</span><span className={styles.itemName}>{item.displayName}</span><span className={styles.category}>{item.category}</span><span className={styles.flavor}>{item.flavorText}</span>
        </button>;
      })}
    </div>
    <p className={styles.status} aria-live="polite">{selectedItemId ? `Selected: ${SURVIVAL_ITEMS.find(({ id }) => id === selectedItemId)?.displayName ?? selectedItemId}. You can change it until this stage locks.` : "Choose one item before the crew moves on."}</p>
  </>;
}

function RescueChoice({ viewerCharacterId, players, characters, characterCatalog, selectedItemId, selectedTargetCharacterId, onSubmitRescue }: CrashChoicePanelProps) {
  const living = characters.filter(({ status }) => status === "alive");
  const risk = rescueRiskLabel();
  return <>
    <p className={styles.instructions}>Your selected item stays with your character. Choose one living person to try to save. Multiple rescuers may choose the same target.</p>
    {selectedItemId && <p className={styles.ownedItem}>Your item: <strong>{SURVIVAL_ITEMS.find(({ id }) => id === selectedItemId)?.displayName ?? selectedItemId}</strong></p>}
    <p className={styles.risk}>Estimated risk: <strong>{risk}</strong></p>
    <div className={styles.targetList} role="group" aria-label="Choose a rescue target">
      {living.map((character) => {
        const definition = characterCatalog.find(({ id }) => id === character.characterId);
        const owner = players.find(({ characterId }) => characterId === character.characterId);
        const selected = selectedTargetCharacterId === character.characterId;
        const self = viewerCharacterId === character.characterId;
        return <button key={character.characterId} type="button" className={styles.target} data-selected={selected} aria-pressed={selected} onClick={() => onSubmitRescue(character.characterId)}>
          <span className={styles.targetDot} style={{ backgroundColor: definition?.tint ?? "#777" }} aria-hidden="true" />
          <span>{definition?.displayName ?? character.characterId}{self ? " · you" : ""}</span>
          {owner && <span className={styles.owner}>played by {owner.displayName}</span>}
        </button>;
      })}
    </div>
    <p className={styles.status} aria-live="polite">{selectedTargetCharacterId ? "Rescue target selected. You can change it until the stage locks." : "Choose who your character will try to save."}</p>
  </>;
}

export function CrashReport({ resolution, characters, catalog }: { resolution: CrashResolution; characters: CharacterState[]; catalog: CharacterDefinition[] }) {
  const characterName = (id: string) => catalog.find(({ id: candidate }) => candidate === id)?.displayName ?? id;
  const ghosts = resolution.eliminatedCharacterIds.length;
  return <section className={`${styles.panel} ${styles.report}`} aria-labelledby="crash-report-title">
    <header className={styles.header}><div><p className={styles.kicker}>BLACK BOX · CRASH REPORT</p><h2 id="crash-report-title">The rescue attempts are in</h2></div><span className={styles.stamp}>RESOLVED</span></header>
    <p className={styles.summary}>{resolution.summary}</p>
    <ul className={styles.attempts}>
      {resolution.attempts.map((attempt, index) => <li key={`${attempt.rescuerCharacterId}-${index}`}>
        <p className={styles.attemptDescription}><strong>{characterName(attempt.rescuerCharacterId)}</strong> tried to save <strong>{characterName(attempt.targetCharacterId)}</strong>
          {attempt.itemId && <> with the {SURVIVAL_ITEMS.find(({ id }) => id === attempt.itemId)?.displayName ?? attempt.itemId}</>}
        </p>
        <span className={styles.outcome} data-outcome={attempt.outcome}>{attempt.outcome.replaceAll("-", " ")}</span>
        {attempt.complicationText && <span className={styles.complication}>{attempt.complicationText}</span>}
        <span className={styles.reaction}>“{(CHARACTER_PROFILES.find(({ characterId }) => characterId === attempt.rescuerCharacterId)?.reactions[attempt.outcome === "success" ? "success" : "danger"] ?? [])[0] ?? "The character has no comment for the incident."}”</span>
      </li>)}
    </ul>
    <div className={styles.totals}><span>{resolution.savedCharacterIds.length} saved</span><span>{ghosts} {ghosts === 1 ? "ghost" : "ghosts"}</span><span>{characters.filter(({ status }) => status === "alive").length} survivors remain</span></div>
  </section>;
}

export function CrashChoicePreview() {
  const [seconds, setSeconds] = useState(90);
  const [phase, setPhase] = useState<CrashChoicePanelProps["phase"]>("crashItemChoice");
  const [itemId, setItemId] = useState<string>();
  const [targetId, setTargetId] = useState<string>();
  useEffect(() => { const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, []);
  const deadline = Date.now() + seconds * 1000;
  const samplePlayers: Player[] = [
    { id: "p_tony", displayName: "Tony", status: "alive", characterId: "cast-tony", ready: true, connected: true, joinedAt: 1 },
    { id: "p_daniel", displayName: "Daniel", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 2 },
  ];
  const sampleCharacters: CharacterState[] = samplePlayers.map(({ characterId }) => ({ characterId: characterId!, status: "alive", resources: { food: 50, health: 100, morale: 65, water: 50 } }));
  const resolution: CrashResolution = { attempts: [{ rescuerCharacterId: "cast-tony", targetCharacterId: "cast-daniel", itemId: itemId ?? "guitar", outcome: "rescuer-lost", complicationText: "Tony tried to pull Daniel clear, caught fire, and is now a very committed ghost." }], savedCharacterIds: ["cast-daniel"], eliminatedCharacterIds: ["cast-tony"], summary: "One rescue attempt: Daniel was saved, one rescuer is now a very committed ghost." };
  return <main className={styles.preview}><p className={styles.previewLabel}>UI PREVIEW · choices here are not sent to a live session</p><nav className={styles.previewNav} aria-label="Preview crash stage">
    <button type="button" aria-pressed={phase === "crashItemChoice"} onClick={() => setPhase("crashItemChoice")}>Item choice</button>
    <button type="button" aria-pressed={phase === "crashRescueChoice"} onClick={() => setPhase("crashRescueChoice")}>Rescue choice</button>
    <button type="button" aria-pressed={phase === "crashResolution"} onClick={() => setPhase("crashResolution")}>Crash report</button>
  </nav><CrashChoicePanel phase={phase} deadline={deadline} itemOffer={["guitar", "knife", "apple"]} selectedItemId={itemId} selectedTargetCharacterId={targetId} viewerCharacterId="cast-tony" players={samplePlayers} characters={phase === "crashResolution" ? sampleCharacters.map((character) => character.characterId === "cast-tony" ? { ...character, status: "ghost" as const } : character) : sampleCharacters} characterCatalog={CHARACTER_CATALOG} resolution={phase === "crashResolution" ? resolution : undefined} onSubmitItem={setItemId} onSubmitRescue={setTargetId} /></main>;
}
