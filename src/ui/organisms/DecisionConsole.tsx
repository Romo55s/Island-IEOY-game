import { useEffect, useState } from "react";
import type { PublicDecision } from "../../shared/domain";
import { Countdown } from "../molecules/Countdown";
import { VoteOption } from "../molecules/VoteOption";
import styles from "./organisms.module.css";
export function DecisionConsole({ decision, deadline, votingOpensAt, serverClockOffsetMs = 0, selectedId, submitted = false, onVote = () => {} }: { decision: PublicDecision; deadline: number; votingOpensAt?: number | null; serverClockOffsetMs?: number | null; selectedId?: string; submitted?: boolean; onVote?: (id: string) => void }) {
  const [estimatedNow, setEstimatedNow] = useState(() => Date.now() + (serverClockOffsetMs ?? 0));
  const hasReadingWindow = votingOpensAt != null;
  const canVote = (!hasReadingWindow || estimatedNow >= votingOpensAt) && estimatedNow < deadline;
  const countdownDeadline = canVote || !hasReadingWindow ? deadline : votingOpensAt;
  const countdownMode = canVote || !hasReadingWindow ? "vote" : "reading";
  useEffect(() => {
    setEstimatedNow(Date.now() + (serverClockOffsetMs ?? 0));
    const timer = window.setInterval(() => setEstimatedNow(Date.now() + (serverClockOffsetMs ?? 0)), 200);
    return () => window.clearInterval(timer);
  }, [serverClockOffsetMs, votingOpensAt, deadline]);
  useEffect(() => {
    const handleNumberVote = (event: KeyboardEvent) => {
      if (!canVote || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = Number(event.key) - 1;
      const option = decision.options[index];
      if (!option || index < 0 || index > 2) return;
      event.preventDefault();
      onVote(option.id);
    };
    window.addEventListener("keydown", handleNumberVote);
    return () => window.removeEventListener("keydown", handleNumberVote);
  }, [decision, onVote, canVote]);
  return <section className={`${styles.paper} ${styles.console}`} aria-labelledby="decision-question"><div className={styles.consoleHeader}><h2 id="decision-question">{decision.prompt}</h2><Countdown deadline={countdownDeadline} now={() => estimatedNow} mode={countdownMode} /></div><div className={styles.options}>{decision.options.slice(0, 3).map((option, index) => <VoteOption key={option.id} index={(index + 1) as 1 | 2 | 3} label={option.label} selected={selectedId === option.id} submitted={submitted && selectedId === option.id} disabled={!canVote} onClick={() => onVote(option.id)} />)}</div>{!canVote && estimatedNow < deadline && <p role="status">Read the situation. Voting opens when the crew is ready.</p>}</section>;
}
