import { useState } from "react";
import { CHARACTER_CATALOG, MAX_PLAYER_COUNT } from "../../shared/domain";
import { toPublicSnapshot } from "../../shared/protocol";
import { advancePhase, resolveCurrentDecision, resolvePendingAssignment, resolvePendingPrivateChoice } from "../../shared/rules/stateMachine";
import { createTeamFeedbackFixture } from "../dev/teamFeedbackFixtures";
import { DecisionConsole } from "../../ui/organisms/DecisionConsole";
import { AssignmentResponsePanel } from "../../ui/organisms/AssignmentResponsePanel";
import { PrivateChoicePanel } from "../../ui/organisms/PrivateChoicePanel";
import { ConsequencePanel } from "../../ui/organisms/ConsequencePanel";
import { CharacterPortrait } from "../../ui/atoms/CharacterPortrait";
import { CharacterPortraitCanvasLayer } from "../../ui/atoms/CharacterModelPortrait";
import { BackButton, RetroButton } from "../../ui/atoms/RetroButton";
import { getIncidentPresentation } from "../story/incidentPresentation";
import { navigateTo } from "../../app/navigation";
import styles from "./TeamFeedbackPreviewScreen.module.css";

type Scenario = "bear" | "group" | "night";
const SCENARIOS: Record<Scenario, { label: string; note: string }> = {
  bear: { label: "Bear encounter", note: "The crew is weighing a risky wildlife encounter." },
  group: { label: "Crew hunger", note: "The whole group is short on food and under pressure." },
  night: { label: "Night hunger", note: "A private nighttime choice tests one survivor's nerve." },
};

function Pips({ value, label }: { value: number; label: string }) {
  return <span className={styles.meter} role="img" aria-label={`${label}: ${value}%`} title={`${label}: ${value}%`}>
    <b aria-hidden="true">{label === "Health" ? "HP" : "FD"}</b>
    <span aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <i key={i} data-filled={value > i * 20 || undefined} />)}</span>
  </span>;
}

export default function TeamFeedbackPreviewScreen() {
  const [kind, setKind] = useState<Scenario>("bear");
  const [count, setCount] = useState(3);
  const [state, setState] = useState(() => createTeamFeedbackFixture("bear", Date.now()));
  const [roll, setRoll] = useState(0);
  const [outsider, setOutsider] = useState(false);
  const actor = state.pendingPrivateChoice?.actorPlayerId ?? state.pendingAssignment?.actorPlayerId ?? "p_0";
  const viewer = outsider ? Object.keys(state.players).find(id => id !== actor) ?? actor : actor;
  const snapshot = toPublicSnapshot(state, viewer);
  const names = Object.fromEntries(CHARACTER_CATALOG.map(character => [character.id, character.displayName]));
  const characterById = new Map(CHARACTER_CATALOG.map(character => [character.id, character]));
  const event = state.eventHistory.at(-1);
  const scene = getIncidentPresentation(snapshot);
  const random = { next: () => roll };
  const activeLines = snapshot.activeCrewDialogue?.lines ?? [];

  function reset(nextKind: Scenario = kind, nextCount = count) {
    setKind(nextKind);
    setCount(nextCount);
    setRoll(0);
    setState(createTeamFeedbackFixture(nextKind, Date.now(), nextCount));
  }

  return <main className={styles.preview}>
    <header className={styles.masthead}>
      <BackButton href="/dev-tools">Dev tools</BackButton>
      <div className={styles.titleBlock}>
        <p className={styles.kicker}>FLIGHT 404 · CREW RADIO TEST</p>
        <h1>Team feedback preview</h1>
        <p className={styles.intro}>Listen for character voices that fit the situation. Choose a scenario, resolve it, and inspect how the crew reacts.</p>
      </div>
      <output className={styles.readout} aria-label={`Current phase ${state.phase}`}>
        <small>PHASE</small><strong>{state.phase.replaceAll(/([A-Z])/gu, " $1").toUpperCase()}</strong>
      </output>
    </header>

    <div className={styles.workspace}>
      <aside className={styles.controlDeck} aria-label="Preview controls">
        <div className={styles.deckHeading}><span>01</span><h2>Scenario controls</h2></div>
        <label className={styles.field}><span>Situation</span><select value={kind} onChange={event => reset(event.target.value as Scenario)}>
          <option value="bear">Bear encounter</option><option value="group">Crew hunger</option><option value="night">Night hunger</option>
        </select></label>
        <label className={styles.field}><span>Crew size</span><select value={count} onChange={event => reset(kind, Number(event.target.value))}>
          {[2, 3, MAX_PLAYER_COUNT].map(size => <option key={size} value={size}>{size} survivors</option>)}
        </select></label>
        <label className={styles.field}><span>Outcome roll</span><select value={roll} onChange={event => setRoll(Number(event.target.value))}>
          <option value={0}>Success</option><option value={0.5}>Injury / resistance</option><option value={0.9}>Death / regret</option>
        </select></label>
        <label className={styles.checkField}><input type="checkbox" checked={outsider} onChange={event => setOutsider(event.target.checked)} /><span>View as another player</span></label>
        <RetroButton type="button" tone="primary" onClick={() => reset()}>Restart scenario</RetroButton>

        <section className={styles.condition} aria-label="Scenario briefing">
          <p className={styles.sectionLabel}>SITUATION BRIEF</p>
          <p>{SCENARIOS[kind].note}</p>
          <small>Route node · {state.campaign?.node ?? "none"}</small>
        </section>

        <section className={styles.crewDeck} aria-labelledby="crew-deck-title">
          <div className={styles.deckHeading}><span>02</span><h2 id="crew-deck-title">Crew manifest</h2></div>
          <ul>
            {snapshot.characters.map(character => {
              const definition = characterById.get(character.characterId);
              const player = snapshot.players.find(candidate => candidate.characterId === character.characterId);
              const name = names[character.characterId] ?? character.characterId;
              return <li key={character.characterId} data-status={character.status}>
                <span className={styles.initials} aria-hidden="true">{name.split(/\s+/u).map(part => part[0]).join("").slice(0, 2)}</span>
                <span className={styles.memberDetails}><strong>{name}</strong><small>{character.status === "ghost" ? "DECEASED" : player?.connected ? "CONNECTED" : "OFFLINE"}</small></span>
                <span className={styles.meters}><Pips label="Health" value={character.resources.health} /><Pips label="Food" value={character.resources.food} /></span>
                {definition?.displayName && <span className={styles.srOnly}>{definition.displayName}</span>}
              </li>;
            })}
          </ul>
        </section>
      </aside>

      <section className={styles.storyColumn}>
        <section className={styles.scene} aria-label={`${scene.location}: ${scene.title}`} style={{ backgroundImage: `linear-gradient(180deg, rgb(5 7 8 / 15%) 0%, rgb(5 7 8 / 35%) 42%, rgb(5 7 8 / 88%) 100%), url("${scene.image}")` }}>
          <div className={styles.sceneHeader}><span>{scene.location}</span><span>INCIDENT SIMULATION</span></div>
          <div className={styles.sceneCopy}><p>FIELD RECORDING · {String(state.decisionIndex + 1).padStart(2, "0")}</p><h2>{scene.title}</h2><span>{scene.description}</span></div>
          {activeLines.length > 0 && <div className={styles.radioTranscript} aria-label="Crew dialogue">
            <div className={styles.radioTitle}><span aria-hidden="true">◉</span><strong>CREW RADIO</strong><small>LIVE EXCHANGE</small></div>
            <div className={styles.dialogueList}>
              {activeLines.map((line, index) => {
                const character = characterById.get(line.characterId);
                const name = names[line.characterId] ?? "Crew member";
                return <article className={styles.voiceLine} key={`${line.characterId}-${index}`} data-emotion={line.emotion}>
                  {character ? <CharacterPortrait className={styles.portrait} name={name} tint={character.tint} characterId={character.id} modelUrl={character.modelUrl} animationName={line.animation} animationEventId={`${snapshot.revision}:${line.characterId}:${line.animation}`} /> : <span className={styles.initials}>{name.slice(0, 2)}</span>}
                  <div><header><strong>{name}</strong><span>{line.emotion.toUpperCase()}</span></header><p>{line.text}</p></div>
                </article>;
              })}
            </div>
          </div>}
        </section>

        {snapshot.phase === "decision" && snapshot.currentDecision && <section className={styles.interaction} aria-label="Decision interaction">
          <div className={styles.panelHeading}><span>03</span><h2>Play the decision</h2><small>CHOICE RESOLUTION</small></div>
          <DecisionConsole decision={snapshot.currentDecision} deadline={snapshot.phaseDeadlineAt!} votingOpensAt={snapshot.votingOpensAt} characterNames={names} characterCatalog={CHARACTER_CATALOG} players={snapshot.players} onVote={(optionId, assignedCharacterId, targetCharacterId) => {
            const voters = state.eligibleVoterIds;
            setState(resolveCurrentDecision({
              ...state,
              votesByPlayer: Object.fromEntries(voters.map(id => [id, optionId])),
              assignmentNominationsByPlayer: assignedCharacterId ? Object.fromEntries(voters.map(id => [id, assignedCharacterId])) : {},
              targetNominationsByPlayer: targetCharacterId ? Object.fromEntries(voters.map(id => [id, targetCharacterId])) : {},
            }, Date.now(), random));
          }} />
        </section>}

        {snapshot.activeAssignment && <section className={styles.interaction} aria-label="Assignment response">
          <AssignmentResponsePanel assignment={snapshot.activeAssignment} actorName={names[snapshot.activeAssignment.actorCharacterId] ?? "Survivor"} viewerAssignment={snapshot.viewerAssignment} onRespond={response => setState(resolvePendingAssignment({ ...state, pendingAssignment: { ...state.pendingAssignment!, response } }, Date.now(), random))} />
        </section>}
        {snapshot.activePrivateChoice && <section className={styles.interaction} aria-label="Private choice">
          <PrivateChoicePanel choice={snapshot.activePrivateChoice} viewerChoice={snapshot.viewerPrivateChoice} characterNames={names} characterCatalog={CHARACTER_CATALOG} players={snapshot.players} onRespond={(optionId, targetCharacterId) => setState(resolvePendingPrivateChoice({ ...state, pendingPrivateChoice: { ...state.pendingPrivateChoice!, response: { optionId, targetCharacterId } } }, Date.now(), random))} />
        </section>}
        {snapshot.phase === "reveal" && event && <section className={styles.interaction} aria-label="Incident report">
          <ConsequencePanel event={event} characterNames={names} />
          <RetroButton type="button" tone="primary" onClick={() => setState(advancePhase(state, state.phaseDeadlineAt!, random))}>Continue campaign</RetroButton>
        </section>}
        <footer className={styles.pageFooter}><span>DEVELOPMENT FIXTURE · LOCAL ONLY</span><RetroButton type="button" onClick={() => navigateTo("/decision-test")}>Open decision test bench</RetroButton></footer>
      </section>
    </div>
    <CharacterPortraitCanvasLayer />
  </main>;
}
