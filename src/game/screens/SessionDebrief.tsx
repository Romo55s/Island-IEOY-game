import { useEffect, useMemo, useRef, useState } from "react";
import type { EndingId, EventEntry, PublicGameSnapshot } from "../../shared/domain";
import { toSessionScenePresentation } from "../../scene/sessionPresentation";
import { ConsequencePanel } from "../../ui/organisms/ConsequencePanel";
import { CharacterInspectorModal } from "../../ui/organisms/CharacterInspectorModal";
import { RetroButton } from "../../ui/atoms/RetroButton";
import { CharacterPortrait } from "../../ui/atoms/CharacterPortrait";
import { CharacterPortraitCanvasLayer } from "../../ui/atoms/CharacterModelPortrait";
import { Skull } from "pixelarticons/react/Skull.js";
import styles from "./SessionDebrief.module.css";

function durationLabel(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function eventTitle(event: EventEntry, index: number): string {
  return event.resolution?.winningOptionLabel ?? event.motorboat?.boatChange?.replaceAll("-", " ") ?? event.campaign?.choice?.replaceAll("-", " ") ?? `Incident ${index + 1}`;
}

export function SessionDebrief({ snapshot, startedAt, endingId, onClose }: { snapshot: PublicGameSnapshot; startedAt: number; endingId?: EndingId; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const entries = useMemo(() => snapshot.eventHistory.filter((event) => event.resolution || event.motorboat || event.campaign || event.desperation), [snapshot.eventHistory]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string>();
  const selected = entries.find(({ id }) => id === selectedId) ?? entries.at(-1);
  const scene = useMemo(() => toSessionScenePresentation(snapshot), [snapshot]);
  const characterNames = useMemo(() => Object.fromEntries(snapshot.characterCatalog.map(({ id, displayName }) => [id, displayName])), [snapshot.characterCatalog]);
  const characterStates = useMemo(() => Object.fromEntries(snapshot.characters.map((character) => [character.characterId, character])), [snapshot.characters]);
  const survivors = snapshot.players.filter(({ status }) => status === "alive").length;
  const casualties = snapshot.players.filter(({ status }) => status === "ghost").length;
  const lastTime = entries.at(-1)?.createdAt ?? startedAt;
  const runDuration = lastTime - startedAt;
  const branchCount = entries.reduce((total, event) => total + Math.max(0, (event.resolution?.optionResults.length ?? 0) - 1), 0);
  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <div className={styles.backdrop} role="presentation">
    <section ref={dialogRef} tabIndex={-1} className={styles.debrief} role="dialog" aria-modal="true" aria-labelledby="debrief-title">
      <header className={styles.header}>
        <div><p className={styles.kicker}>FLIGHT 404 · RECORDING RECOVERED</p><h1 id="debrief-title">Session debrief</h1><p className={styles.subhead}>Black-box decision log · {snapshot.code}</p></div>
        <section className={styles.finalResult} aria-label="Final match result">
          <div><span>Final result</span><strong>{endingId?.replaceAll("-", " ") ?? "Session complete"}</strong></div>
          <dl><div><dt>Survivors</dt><dd>{survivors}</dd></div><div><dt>Casualties</dt><dd>{casualties}</dd></div><div><dt>Run duration</dt><dd>{durationLabel(runDuration)}</dd></div></dl>
        </section>
        <RetroButton type="button" onClick={onClose} aria-label="Close session history">Close log</RetroButton>
      </header>

      <div className={styles.columns}>
        <aside className={styles.manifest} aria-labelledby="manifest-title">
          <h2 id="manifest-title">Final character manifest</h2>
          <ul>{snapshot.players.map((player) => {
            const id = player.characterId;
            const character = snapshot.characterCatalog.find((entry) => entry.id === id);
            const state = id ? characterStates[id] : undefined;
            const status = player.status === "alive" ? "ALIVE" : "DEAD";
            const member = scene.members.find((entry) => entry.playerId === player.id);
            return <li key={player.id} data-status={player.status}>
              <button type="button" className={styles.memberCard} onClick={() => character && member && setInspectedPlayerId(player.id)} disabled={!character || !member} aria-label={`View ${character?.displayName ?? player.displayName}'s character and stats`}>
                {character ? <CharacterPortrait
                  className={styles.modelPortrait}
                  name={character.displayName}
                  tint={character.tint}
                  characterId={character.id}
                  modelUrl={character.modelUrl}
                  animationName={member?.animationName ?? "idle"}
                  animationEventId={`debrief:${player.id}:${player.status}`}
                /> : <span className={styles.portrait}>?</span>}
                <span className={styles.member}><strong>{character?.displayName ?? player.displayName}</strong><small>{status}{state && player.status === "alive" ? ` · HP ${state.resources.health}` : ""}</small></span>
                <span className={styles.statusIcon} aria-label={player.status === "alive" ? "Alive" : "Dead"}>{player.status === "alive" ? "＋" : <Skull aria-hidden="true" />}</span>
              </button>
            </li>;
          })}</ul>
          <p className={styles.manifestNote}>Crew status and health are taken from the final match state.</p>
        </aside>

        <section className={styles.timeline} aria-labelledby="timeline-title">
          <header><h2 id="timeline-title">Decision timeline</h2><span>{entries.length} recorded events · {branchCount} alternate branches</span></header>
          {entries.length === 0 ? <p className={styles.empty}>No decisions were recorded in this session.</p> : <ol>{entries.map((event, index) => {
            const time = durationLabel(event.createdAt - startedAt);
            const label = eventTitle(event, index);
            const options = event.resolution?.optionResults ?? [];
            return <li key={event.id} data-selected={(selected?.id === event.id) || undefined}>
              <button type="button" className={styles.eventButton} aria-pressed={selected?.id === event.id} onClick={() => setSelectedId(event.id)}>
                <time>{`T+${time}`}</time><strong>{label}</strong><span>{event.resolution?.outcomeText ?? event.text}</span>
                <small>{event.resolution ? "DECISION RESOLVED" : "BLACK-BOX EVENT"}</small>
              </button>
              {options.length > 0 && <ul className={styles.branches}>{options.map((option) => <li key={option.optionId} data-chosen={option.optionId === event.resolution?.winningOptionId || undefined}>
                <span aria-hidden="true">{option.optionId === event.resolution?.winningOptionId ? "✓" : "·"}</span><span>{option.label}</span><b>{option.votes}</b>
              </li>)}</ul>}
            </li>;
          })}</ol>}
        </section>

        <aside className={styles.details} aria-labelledby="details-title">
          <h2 id="details-title">Decision details</h2>
          {selected ? <><div className={styles.detailHeading}><span aria-hidden="true">⌖</span><div><strong>{eventTitle(selected, entries.indexOf(selected))}</strong><small>{`T+${durationLabel(selected.createdAt - startedAt)} · ${selected.resolution?.decisionId ?? "Route event"}`}</small></div></div><ConsequencePanel event={selected} characterNames={characterNames} /></> : <p className={styles.empty}>Choose a timeline entry to inspect its outcome.</p>}
        </aside>
      </div>
      <footer className={styles.footer}><span>/// The black box remembers every decision.</span><RetroButton type="button" tone="primary" onClick={onClose}>Return to ending</RetroButton></footer>
      {!inspectedPlayerId && <CharacterPortraitCanvasLayer aboveModal />}
      {inspectedPlayerId && (() => {
        const player = snapshot.players.find(({ id }) => id === inspectedPlayerId);
        const member = scene.members.find(({ playerId }) => playerId === inspectedPlayerId);
        const definition = member && snapshot.characterCatalog.find(({ id }) => id === member.characterId);
        if (!player || !member || !definition) return null;
        return <CharacterInspectorModal player={player} member={member} character={snapshot.characters.find(({ characterId }) => characterId === member.characterId)} definition={definition} onClose={() => setInspectedPlayerId(undefined)} />;
      })()}
    </section>
  </div>;
}
