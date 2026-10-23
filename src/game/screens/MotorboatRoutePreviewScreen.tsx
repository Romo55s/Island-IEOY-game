import { useMemo, useState } from "react";
import { MOTORBOAT_ROUTE_PREVIEW_SCENARIOS, type MotorboatPreviewScenarioId } from "../dev/motorboatRouteFixtures";
import { SessionIslandView } from "./SessionIslandView";
import { MotorboatStatusPanel } from "../../ui/organisms/MotorboatStatusPanel";
import { ConsequencePanel } from "../../ui/organisms/ConsequencePanel";
import { EndingSummary } from "../../ui/organisms/EndingSummary";
import { PrivateChoicePanel } from "../../ui/organisms/PrivateChoicePanel";
import { RetroButton } from "../../ui/atoms/RetroButton";
import styles from "./DevPresentationPreview.module.css";

/** Development-only route player. It renders fixed public snapshots and never sends commands. */
export default function MotorboatRoutePreviewScreen() {
  const [scenarioId, setScenarioId] = useState<MotorboatPreviewScenarioId>("shared-group");
  const [stepIndex, setStepIndex] = useState(0);
  const scenario = MOTORBOAT_ROUTE_PREVIEW_SCENARIOS.find(({ id }) => id === scenarioId)!;
  const step = scenario.steps[Math.min(stepIndex, scenario.steps.length - 1)]!;
  const snapshot = step.snapshot;
  const latestEvent = snapshot.eventHistory.at(-1);
  const characterNames = useMemo(() => Object.fromEntries(snapshot.characterCatalog.map(({ id, displayName }) => [id, displayName])), [snapshot.characterCatalog]);
  const setScenario = (id: MotorboatPreviewScenarioId) => { setScenarioId(id); setStepIndex(0); };
  // Preview snapshots use a stable epoch for reproducible scene events. Offset
  // the private-choice clock locally so its 15-second interaction surface can
  // still be inspected during a development session.
  const previewClockOffsetMs = snapshot.activePrivateChoice ? snapshot.activePrivateChoice.deadlineAt - Date.now() - 15_000 : 0;

  return <main className={styles.preview}>
    <header className={styles.masthead}>
      <div><p className={styles.kicker}>Development fixture</p><h1 className={styles.title}>Motorboat route preview</h1><p className={styles.intro}>Deterministic public snapshots for inspecting the escape route. No gameplay commands are sent.</p></div>
      <output className={styles.frame} aria-label="Preview step"><span className={styles.frameLabel}>Current frame</span><strong>{stepIndex + 1}/{scenario.steps.length} · {step.label}</strong></output>
    </header>
    <div className={styles.routeGrid}>
      <nav className={styles.controlDeck} aria-label="Motorboat preview controls">
        <p className={styles.deckLabel}>Route simulator</p>
        <label className={styles.field}><span>Route</span><select value={scenarioId} onChange={(event) => setScenario(event.target.value as MotorboatPreviewScenarioId)}>
          {MOTORBOAT_ROUTE_PREVIEW_SCENARIOS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
        </select></label>
        <div className={styles.stepper}>
          <RetroButton type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>Previous step</RetroButton>
          <RetroButton type="button" tone="danger" disabled={stepIndex === scenario.steps.length - 1} onClick={() => setStepIndex((value) => Math.min(scenario.steps.length - 1, value + 1))}>Next step</RetroButton>
        </div>
        <p className={styles.scenarioCopy}>{scenario.description}</p>
      </nav>
      <section className={styles.stage} aria-labelledby="route-stage-title">
        <header className={styles.stageHeader}><h2 id="route-stage-title">Live route state</h2><p>Public information only</p></header>
        <MotorboatStatusPanel status={snapshot.motorboat!} launchMode={scenarioId === "hidden-solo" ? "solo" : "group"} />
        <div className={styles.sceneFrame}><SessionIslandView snapshot={snapshot} /></div>
      </section>
      {(snapshot.activePrivateChoice || latestEvent || snapshot.endingId) && <section className={styles.eventRail} aria-label="Route outcome details">
        {snapshot.activePrivateChoice && <PrivateChoicePanel
      choice={snapshot.activePrivateChoice}
      viewerChoice={snapshot.viewerPrivateChoice}
      actorName={snapshot.activePrivateChoice.publicActorCharacterId ? characterNames[snapshot.activePrivateChoice.publicActorCharacterId] : undefined}
      characterNames={characterNames}
      motorboat={snapshot.motorboat}
      serverClockOffsetMs={previewClockOffsetMs}
      onRespond={() => undefined}
    />}
        {latestEvent && <ConsequencePanel event={latestEvent} characterNames={characterNames} />}
        {snapshot.endingId && <EndingSummary
      curtain={false}
      endingId={snapshot.endingId}
      survivors={snapshot.characters.filter(({ status }) => status === "alive").length}
      ghosts={snapshot.characters.filter(({ status }) => status === "ghost").length}
      escapeResult={snapshot.escapeResult}
      characterNames={characterNames}
      onReturn={() => setStepIndex(0)}
    />}
      </section>}
    </div>
  </main>;
}
