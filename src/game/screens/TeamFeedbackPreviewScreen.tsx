import { useState } from "react";
import { CHARACTER_CATALOG, MAX_PLAYER_COUNT } from "../../shared/domain";
import { toPublicSnapshot } from "../../shared/protocol";
import { advancePhase, resolveCurrentDecision, resolvePendingAssignment, resolvePendingPrivateChoice } from "../../shared/rules/stateMachine";
import { createTeamFeedbackFixture } from "../dev/teamFeedbackFixtures";
import { DecisionConsole } from "../../ui/organisms/DecisionConsole";
import { AssignmentResponsePanel } from "../../ui/organisms/AssignmentResponsePanel";
import { PrivateChoicePanel } from "../../ui/organisms/PrivateChoicePanel";
import { ConsequencePanel } from "../../ui/organisms/ConsequencePanel";
import { getIncidentPresentation } from "../story/incidentPresentation";
import styles from "./TeamFeedbackPreviewScreen.module.css";

export default function TeamFeedbackPreviewScreen() {
  const [kind,setKind]=useState<"bear"|"group"|"night">("bear");
  const [count,setCount]=useState(3);
  const [state,setState]=useState(()=>createTeamFeedbackFixture("bear",Date.now()));
  const [roll,setRoll]=useState(0);
  const [outsider,setOutsider]=useState(false);
  const actor=state.pendingPrivateChoice?.actorPlayerId ?? state.pendingAssignment?.actorPlayerId ?? "p_0";
  const viewer=outsider ? Object.keys(state.players).find(id=>id!==actor)! : actor;
  const snapshot=toPublicSnapshot(state,viewer);
  const names=Object.fromEntries(CHARACTER_CATALOG.map(c=>[c.id,c.displayName]));
  const event=state.eventHistory.at(-1);
  const scene=getIncidentPresentation(snapshot);
  const random={next:()=>roll};
  function reset(nextKind=kind,nextCount=count) { setKind(nextKind);setCount(nextCount);setState(createTeamFeedbackFixture(nextKind,Date.now(),nextCount)); }
  return <main className={styles.preview}>
    <h1>Team feedback preview</h1>
    <p>Development fixture using the live decision components and server rules. Choose a deterministic outcome roll, then play the choice.</p>
    <div className={styles.controls}>
      <label>Scenario <select value={kind} onChange={e=>reset(e.target.value as typeof kind)}><option value="bear">Bear encounter</option><option value="group">Group hunger</option><option value="night">Nighttime hunger</option></select></label>
      <label>Crew size <select value={count} onChange={e=>reset(kind,Number(e.target.value))}>{[2,3,MAX_PLAYER_COUNT].map(n=><option key={n}>{n}</option>)}</select></label>
      <label>Outcome roll <select value={roll} onChange={e=>setRoll(Number(e.target.value))}><option value={0}>0 · success</option><option value={0.5}>0.5 · injury / resistance</option><option value={0.9}>0.9 · death / regret</option></select></label>
      <label><input type="checkbox" checked={outsider} onChange={e=>setOutsider(e.target.checked)}/> View as another player</label>
      <button onClick={()=>reset()}>Restart scenario</button>
    </div>
    <p aria-label="Preview phase">Phase: {state.phase} · Next route node: {state.campaign?.node}</p>
    <section className={styles.stage} style={{backgroundImage:`linear-gradient(#141a1d99,#141a1ddd),url(${scene.image})`}}>
      <h2>{scene.title}</h2>
      {snapshot.activeCrewDialogue && <aside aria-label="Crew dialogue">{snapshot.activeCrewDialogue.lines.map(line=><p key={line.characterId}><b>{names[line.characterId]}:</b> {line.text}</p>)}</aside>}
      {snapshot.phase==="decision" && snapshot.currentDecision && <DecisionConsole decision={snapshot.currentDecision} deadline={snapshot.phaseDeadlineAt!} votingOpensAt={snapshot.votingOpensAt} characterNames={names} characterCatalog={CHARACTER_CATALOG} players={snapshot.players} onVote={(optionId,assignedCharacterId,targetCharacterId)=>{
        const voters=state.eligibleVoterIds;
        setState(resolveCurrentDecision({...state,votesByPlayer:Object.fromEntries(voters.map(id=>[id,optionId])),assignmentNominationsByPlayer:assignedCharacterId?Object.fromEntries(voters.map(id=>[id,assignedCharacterId])):{},targetNominationsByPlayer:targetCharacterId?Object.fromEntries(voters.map(id=>[id,targetCharacterId])):{}},Date.now(),random));
      }}/>}
      {snapshot.activeAssignment && <AssignmentResponsePanel assignment={snapshot.activeAssignment} actorName={names[snapshot.activeAssignment.actorCharacterId] ?? "Survivor"} viewerAssignment={snapshot.viewerAssignment} onRespond={response=>setState(resolvePendingAssignment({...state,pendingAssignment:{...state.pendingAssignment!,response}},Date.now(),random))}/>}
      {snapshot.activePrivateChoice && <PrivateChoicePanel choice={snapshot.activePrivateChoice} viewerChoice={snapshot.viewerPrivateChoice} characterNames={names} characterCatalog={CHARACTER_CATALOG} players={snapshot.players} onRespond={(optionId,targetCharacterId)=>setState(resolvePendingPrivateChoice({...state,pendingPrivateChoice:{...state.pendingPrivateChoice!,response:{optionId,targetCharacterId}}},Date.now(),random))}/>}
      {snapshot.phase==="reveal" && event && <><ConsequencePanel event={event} characterNames={names}/><button onClick={()=>setState(advancePhase(state,state.phaseDeadlineAt!,random))}>Continue campaign</button></>}
    </section>
    <section aria-label="Crew status"><h2>Crew status</h2><ul>{snapshot.characters.map(c=><li key={c.characterId}>{names[c.characterId]} · {c.status} · Food {c.resources.food} · Health {c.resources.health}</li>)}</ul></section>
  </main>;
}
