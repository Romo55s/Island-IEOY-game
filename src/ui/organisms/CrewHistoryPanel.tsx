import type { EventEntry, ResolvedResourceChange } from "../../shared/domain";
import styles from "./CrewHistoryPanel.module.css";

const RESOURCE_NAMES = { food: "food", health: "health", morale: "morale", water: "water", shelter: "shelter" } as const;

function causeLabel(change: ResolvedResourceChange, event: EventEntry): string {
  if (change.cause === "starvation") return "hunger";
  if (change.cause === "daily-consumption") return "daily survival";
  if (change.scope === "crew") return "crew decision";
  const prompt = event.resolution?.prompt ?? "the crew's decision";
  return prompt;
}

export function CrewHistoryPanel({ events, characterNames }: { events: EventEntry[]; characterNames: Record<string, string> }) {
  if (events.length === 0) return <p className={styles.empty}>No events have been recorded yet.</p>;

  return <ol className={styles.history} aria-label="Black-box event history; newest first">
    {[...events].reverse().map((event) => {
      const resolution = event.resolution;
      const title = resolution?.prompt ?? event.decisionId?.replaceAll("-", " ") ?? "Crew event";
      const healthChanges = resolution?.resourceChanges.filter((change) => change.resource === "health") ?? [];
      const statusChanges = resolution?.statusChanges ?? [];
      return <li className={styles.entry} key={event.id}>
        <h3>{title}</h3>
        <p className={styles.outcome}>{resolution?.outcomeText ?? event.text}</p>
        {(healthChanges.length > 0 || statusChanges.length > 0) && <ul className={styles.consequences}>
          {healthChanges.map((change, index) => {
            if (change.scope !== "character") return null;
            const name = characterNames[change.characterId] ?? change.characterId;
            const amount = `${change.delta > 0 ? "+" : ""}${change.delta}`;
            return <li key={`${event.id}:health:${change.characterId}:${index}`} data-direction={change.delta < 0 ? "loss" : "gain"}>
              {name}: {amount} health ({change.before} → {change.after}) · {causeLabel(change, event)}
            </li>;
          })}
          {statusChanges.map((change, index) => <li key={`${event.id}:status:${change.characterId}:${index}`} data-direction={change.after === "ghost" ? "loss" : "gain"}>
            {characterNames[change.characterId] ?? change.characterId} {change.after === "ghost" ? "died" : "survived"} · {change.cause === "starvation" ? "hunger" : change.cause === "storm-surge" ? "storm surge" : "decision outcome"}
          </li>)}
        </ul>}
      </li>;
    })}
  </ol>;
}
