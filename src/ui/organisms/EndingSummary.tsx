import { useEffect, useRef } from "react";
import { RetroButton } from "../atoms/RetroButton";
import type { EndingId, EscapeResult } from "../../shared/domain";
import styles from "./organisms.module.css";

const endings: Record<EndingId, { title: string; description: string }> = {
  "group-escape": { title: "They actually escaped together", description: "The motorboat left with a crew, several opinions, and exactly enough confidence to be dangerous." },
  "solo-escape": { title: "One seat, zero shame", description: "The motorboat left with one passenger. The island retained everyone else’s feedback." },
  "signal-rescue": { title: "The signal made it through", description: "A passing vessel found the crew before the weather erased their last chance to be seen." },
  "no-survivors": { title: "The island wins on a technicality", description: "The final report lists the storm as weather and the planning process as a contributing factor." },
};

const epilogues: Record<EscapeResult["epilogueId"], string> = {
  "motorboat-group-aftermath-v1": "The survivors later described the voyage as coordinated. Nobody from the boat was available to confirm this independently.",
  "motorboat-selfish-aftermath-v1": "The sole escapee sold the story as a lesson in decisive leadership. The stranded crew would have requested several edits.",
  "signal-rescue-aftermath-v1": "The rescue crew asked how the signal was built. The survivors gave three different answers, all with confidence.",
  "motorboat-storm-aftermath-v1": "Weeks later, the empty motorboat was recovered in suspiciously excellent condition. The meeting notes were not.",
  "motorboat-all-dead-aftermath-v1": "The ghost committee adopted a unanimous motion declaring the motorboat somebody else’s problem.",
};

function names(ids: string[], characterNames: Record<string, string>): string {
  if (ids.length === 0) return "None";
  return ids.map((id) => characterNames[id] ?? id).join(", ");
}

export function EndingSummary({ endingId, survivors, ghosts, escapeResult, characterNames = {}, curtain = true, layout = "default", onReturn, onViewHistory }: { endingId: EndingId; survivors: number; ghosts: number; escapeResult?: EscapeResult; characterNames?: Record<string, string>; curtain?: boolean; layout?: "default" | "cinematic"; onReturn: () => void; onViewHistory?: () => void }) {
  const ending = endings[endingId];
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return <section className={`${curtain ? styles.endingCurtain : styles.endingPreview} ${layout === "cinematic" ? styles.cinematicEnding : ""}`} aria-labelledby="ending-title">
    <div className={`${styles.paper} ${styles.summary}`}>
      <p className={styles.assignmentEyebrow}>Black-box aftermath</p>
      <h2 ref={titleRef} tabIndex={-1} className={styles.heading} id="ending-title">{ending.title}</h2>
      <p>{ending.description}</p>
      {escapeResult ? <dl className={styles.fateList}>
        <div><dt>Escaped</dt><dd>{names(escapeResult.escapedCharacterIds, characterNames)}</dd></div>
        <div><dt>Stranded</dt><dd>{names(escapeResult.strandedCharacterIds, characterNames)}</dd></div>
        <div><dt>Dead</dt><dd>{names(escapeResult.deadCharacterIds, characterNames)}</dd></div>
      </dl> : <div className={styles.stats}><strong>{survivors} {survivors === 1 ? "survivor" : "survivors"}</strong><strong>{ghosts} {ghosts === 1 ? "ghost consultant" : "ghost consultants"}</strong></div>}
      {escapeResult && <p className={styles.epilogue}>{epilogues[escapeResult.epilogueId]}</p>}
      {onViewHistory && <RetroButton type="button" onClick={onViewHistory}>View decision history</RetroButton>}
      <RetroButton tone="primary" onClick={onReturn}>Return to shore</RetroButton>
    </div>
  </section>;
}
