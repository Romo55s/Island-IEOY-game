import { useId } from "react";
import type { EventEntry, MotorboatEventFacts, ResolvedResourceChange } from "../../shared/domain";
import styles from "./organisms.module.css";

const RESOURCE_LABELS = { food: "Food", health: "Health", morale: "Morale", water: "Water", shelter: "Shelter" } as const;
const CAUSE_LABELS = { outcome: "consequence", "daily-consumption": "daily use", starvation: "starvation", "storm-surge": "storm surge" } as const;

interface GroupedResourceChange {
  change: ResolvedResourceChange;
  owners: string[];
}

function groupResourceChanges(changes: ResolvedResourceChange[], characterNames: Record<string, string>): GroupedResourceChange[] {
  const grouped = new Map<string, GroupedResourceChange>();
  for (const change of changes) {
    const owner = change.scope === "crew" ? "Crew" : characterNames[change.characterId] ?? change.characterId;
    const key = `${change.scope}:${change.resource}:${change.before}:${change.after}:${change.delta}:${change.cause}`;
    const existing = grouped.get(key);
    if (existing) existing.owners.push(owner);
    else grouped.set(key, { change, owners: [owner] });
  }
  return [...grouped.values()];
}

function changeLabel({ change, owners }: GroupedResourceChange): string {
  const sign = change.delta > 0 ? "+" : "";
  return `${owners.join(", ")} · ${RESOURCE_LABELS[change.resource]} ${change.before} → ${change.after} (${sign}${change.delta}, ${CAUSE_LABELS[change.cause]})`;
}

function assignmentResultLabel(event: EventEntry, characterNames: Record<string, string>): string | null {
  const assignment = event.resolution?.assignment;
  if (!assignment) return null;
  const actor = characterNames[assignment.actorCharacterId] ?? assignment.actorCharacterId;
  switch (assignment.result) {
    case "accepted": return `${actor} accepted the assignment to ${assignment.roleLabel}.`;
    case "timeout-accepted": return `${actor} did not answer in time and accepted the assignment to ${assignment.roleLabel}.`;
    case "refusal-succeeded": return `${actor} successfully refused the assignment to ${assignment.roleLabel}.`;
    case "refusal-failed": return `${actor} tried to refuse, failed, and was forced to ${assignment.roleLabel}.`;
    case "actor-unavailable": return `${actor} could no longer take the assignment to ${assignment.roleLabel}, so the crew faced the fallback consequence.`;
  }
}

const BOAT_CHANGE_LABELS: Record<NonNullable<MotorboatEventFacts["boatChange"]>, string> = {
  discovered: "The motorboat was discovered.",
  "fuel-shared": "The fuel was shared with camp.",
  "fuel-kept-private": "The fuel remains in private hands.",
  "repaired-sturdy": "The engine was repaired into sturdy condition.",
  "repaired-fragile": "The engine runs, but remains fragile.",
  "custodian-woke-group": "The night custodian woke the group for the last good tide.",
  "launch-failed": "The launch failed and the motorboat was beached again.",
  "solo-launch-failed": "The solo launch failed and the motorboat returned to shore.",
  "quiet-miss": "The custodian let a valid tide pass without revealing why.",
  escaped: "The motorboat escaped the island.",
  "storm-destroyed": "The storm surge destroyed the motorboat.",
} as const;

function motorboatFacts(event: EventEntry, characterNames: Record<string, string>): string[] {
  const facts = event.resolution?.motorboat ?? event.motorboat;
  if (!facts) return [];
  return [
    ...(facts.boatChange ? [BOAT_CHANGE_LABELS[facts.boatChange]] : []),
    ...(facts.passengerCharacterIds ? [`Actual passengers: ${facts.passengerCharacterIds.length > 0 ? facts.passengerCharacterIds.map((id) => characterNames[id] ?? id).join(", ") : "none"}.`] : []),
    ...(facts.fuelConsumed ? ["One fuel charge was consumed."] : []),
    ...(facts.missNumber ? [`Escape opportunity ${facts.opportunityId ?? "unknown"} was genuinely missed. Storm warning is now ${facts.missNumber} of 3.`] : []),
    ...(facts.endingCause === "group-launch" ? ["The crew escaped together."] : []),
    ...(facts.endingCause === "solo-launch" ? ["A solo departure ended the session."] : []),
    ...(facts.endingCause === "storm-surge" ? ["The third missed opportunity ended in the storm surge."] : []),
    ...(facts.endingCause === "all-dead" ? ["No living character remained to continue the route."] : []),
  ];
}

export function ConsequencePanel({ event, characterNames = {} }: { event: EventEntry; characterNames?: Record<string, string> }) {
  const headingId = useId();
  const resolution = event.resolution;
  const groupedChanges = resolution ? groupResourceChanges(resolution.resourceChanges, characterNames) : [];
  const assignmentResult = assignmentResultLabel(event, characterNames);
  const boatFacts = motorboatFacts(event, characterNames);
  return <section className={styles.reportFrame} aria-labelledby={headingId}><article className={`${styles.paper} ${styles.report}`}>
    <span className={styles.stamp}>Incident report</span>
    <h2 className={styles.heading} id={headingId}>{resolution ? `The crew chose “${resolution.winningOptionLabel}.”` : "The island responded."}</h2>
    <p className={styles.outcome}>{resolution?.outcomeText ?? event.text}</p>
    {boatFacts.length > 0 && <section className={styles.reportSection} aria-labelledby={`${headingId}-motorboat`}>
      <h3 id={`${headingId}-motorboat`}>Motorboat route</h3>
      <ul className={styles.changeList}>{boatFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
    </section>}
    {resolution && <>
      {assignmentResult && <p className={styles.assignmentResult}>{assignmentResult}</p>}
      <section className={styles.reportSection} aria-labelledby={`${headingId}-votes`}>
        <h3 id={`${headingId}-votes`}>Anonymous vote</h3>
        <ul className={styles.voteResults}>{resolution.optionResults.map((result) => <li key={result.optionId} data-winner={result.optionId === resolution.winningOptionId}>
          <span>{result.label}</span><b>{result.votes}</b>
        </li>)}</ul>
      </section>
      <section className={styles.reportSection} aria-labelledby={`${headingId}-changes`}>
        <h3 id={`${headingId}-changes`}>What actually changed</h3>
        {resolution.resourceChanges.length === 0 && resolution.statusChanges.length === 0
          ? <p className={styles.noChange}>No measured resources changed.</p>
          : <ul className={styles.changeList}>
            {groupedChanges.map((group, index) => <li key={`${group.change.scope}:${group.change.resource}:${group.change.cause}:${index}`} data-direction={group.change.delta > 0 ? "gain" : "loss"}>{changeLabel(group)}</li>)}
            {resolution.statusChanges.map((change) => <li key={`${change.characterId}:${change.cause}`} data-direction="loss">{characterNames[change.characterId] ?? change.characterId} became a ghost ({CAUSE_LABELS[change.cause]}).</li>)}
          </ul>}
      </section>
    </>}
  </article></section>;
}
