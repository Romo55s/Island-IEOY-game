import { useMemo, useState } from "react";
import { CHARACTER_CATALOG, type PublicGameSnapshot } from "../../shared/domain";
import { SessionIslandView } from "./SessionIslandView";
import { RetroButton } from "../../ui/atoms/RetroButton";
import styles from "./DevPresentationPreview.module.css";

/** Dev-only fixtures, rendered through the real live presentation, never the server. */
export default function EncounterPreviewScreen() {
  const [count, setCount] = useState(8);
  const [cardId, setCardId] = useState("distress-flare");
  const [event, setEvent] = useState({ id: 0, time: Date.now(), kind: "decision" });
  const [freeCamera, setFreeCamera] = useState(false);
  const next = (kind: string) => setEvent((previous) => ({ id: previous.id + 1, time: Date.now(), kind }));
  const snapshot = useMemo<PublicGameSnapshot>(() => {
    const catalog = CHARACTER_CATALOG.slice(0, count);
    const dead = event.kind === "death";
    const phase = event.kind === "decision" ? "decision" : "reveal";
    return {
      code: "PREV23", revision: event.id, phase, hostPlayerId: "preview-0", phaseStartedAt: event.time,
      phaseDeadlineAt: event.time + 30000, votingOpensAt: event.time, earliestResolveAt: event.time, phaseEndsAt: event.time + 30000,
      players: catalog.map((character, index) => ({ id: `preview-${index}`, displayName: `Player ${index + 1}`, characterId: character.id, status: dead && index === 0 ? "ghost" : "alive", ready: true, connected: true, joinedAt: index })),
      characters: catalog.map((character, index) => ({ characterId: character.id, status: dead && index === 0 ? "ghost" : "alive", resources: { health: dead && index === 0 ? 0 : 100, food: 80, water: 80, morale: 70 } })),
      characterCatalog: CHARACTER_CATALOG, resources: { shelter: 50 },
      currentDecision: { id: cardId, prompt: "Presentation fixture", options: [{ id: "a", label: "Try it" }] },
      decisionNumber: event.id + 1, totalDecisions: 10, eligibleVoterIds: catalog.map((_, index) => `preview-${index}`),
      eventHistory: phase === "decision" ? [] : [{ id: `preview-event-${event.id}`, text: dead ? "Daniel died in this fixture." : "A successful fixture event.", createdAt: event.time, decisionId: cardId, socialCue: dead ? "danger" : "success", deathCharacterIds: dead ? [catalog[0]!.id] : [] }],
      viewer: { playerId: "preview-0", hasVoted: false },
    };
  }, [count, cardId, event]);

  return <main className={styles.preview}>
    <header className={styles.masthead}>
      <div><p className={styles.kicker}>Development fixture</p><h1 className={styles.title}>Encounter presentation preview</h1><p className={styles.intro}>Use the real island renderer to check staging, crew density, and consequence beats without changing game state.</p></div>
      <output className={styles.frame} aria-label="Preview event"><span className={styles.frameLabel}>Fixture event</span><strong>#{event.id}</strong></output>
    </header>
    <div className={styles.previewGrid}>
      <nav className={styles.controlDeck} aria-label="Encounter preview controls">
        <p className={styles.deckLabel}>Scene inputs</p>
        <label className={styles.field}><span>Crew size</span><select value={count} onChange={(e) => setCount(Number(e.target.value))}><option value={2}>2</option><option value={8}>8</option></select></label>
        <label className={styles.field}><span>Encounter</span><select value={cardId} onChange={(e) => { setCardId(e.target.value); next("decision"); }}>
        <option value="wreckage-lighter">Crash beach</option><option value="coconut-jury">Jungle clearing</option>
        <option value="distress-flare">Rocky coast</option><option value="rainwater-budget">Waterfall pool</option>
        <option value="shelter-politics">Forest crossroads</option><option value="cave-of-bad-ideas">Mountain foothills</option>
        </select></label>
        <div className={styles.actions}>
          <RetroButton type="button" onClick={() => next("success")}>Replay success</RetroButton>
          <RetroButton type="button" tone="danger" data-tone="danger" onClick={() => next("death")}>Show death</RetroButton>
          <RetroButton type="button" tone="primary" data-tone="reset" onClick={() => next("decision")}>Reset to decision</RetroButton>
          <RetroButton type="button" aria-pressed={freeCamera} onClick={() => setFreeCamera((enabled) => !enabled)}>{freeCamera ? "Lock directed camera" : "Enable free camera"}</RetroButton>
        </div>
      </nav>
      <section className={styles.encounterStage} aria-labelledby="encounter-stage-title">
        <header className={styles.stageHeader}><h2 id="encounter-stage-title">Live scene</h2><p>{freeCamera ? "Free inspection controls active" : "Directed camera framing"}</p></header>
        <div className={styles.sceneFrame}><SessionIslandView snapshot={snapshot} freeCamera={freeCamera} sceneLabel={event.kind === "decision" ? "Encounter preview" : event.kind === "death" ? "Death aftermath preview" : "Outcome preview"} /></div>
      </section>
    </div>
  </main>;
}
