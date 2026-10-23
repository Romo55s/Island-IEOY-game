import { useEffect, useState } from "react";
import type { PublicDecision } from "../../shared/domain";
import { Countdown } from "../molecules/Countdown";
import { VoteOption } from "../molecules/VoteOption";
import styles from "./organisms.module.css";
export function DecisionConsole({ decision, deadline, votingOpensAt, serverClockOffsetMs = 0, selectedId, submitted = false, characterNames = {}, onVote = () => {} }: { decision: PublicDecision; deadline: number; votingOpensAt?: number | null; serverClockOffsetMs?: number | null; selectedId?: string; submitted?: boolean; characterNames?: Record<string, string>; onVote?: (id: string, assignedCharacterId?: string) => void }) {
  const [estimatedNow, setEstimatedNow] = useState(() => Date.now() + (serverClockOffsetMs ?? 0));
  const [nominations, setNominations] = useState<Record<string, string>>({});
  const hasReadingWindow = votingOpensAt != null;
  const canVote = (!hasReadingWindow || estimatedNow >= votingOpensAt) && estimatedNow < deadline;
  const countdownDeadline = canVote || !hasReadingWindow ? deadline : votingOpensAt;
  const countdownMode = canVote || !hasReadingWindow ? "vote" : "reading";
  useEffect(() => {
    setEstimatedNow(Date.now() + (serverClockOffsetMs ?? 0));
    const timer = window.setInterval(() => setEstimatedNow(Date.now() + (serverClockOffsetMs ?? 0)), 200);
    return () => window.clearInterval(timer);
  }, [serverClockOffsetMs, votingOpensAt, deadline]);
  useEffect(() => setNominations({}), [decision.id]);
  useEffect(() => {
    const handleNumberVote = (event: KeyboardEvent) => {
      if (!canVote || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = Number(event.key) - 1;
      const option = decision.options[index];
      if (!option || index < 0 || index > 2) return;
      event.preventDefault();
      const assignedCharacterId = nominations[option.id];
      if (option.assignment && !assignedCharacterId) return;
      if (option.assignment) onVote(option.id, assignedCharacterId);
      else onVote(option.id);
    };
    window.addEventListener("keydown", handleNumberVote);
    return () => window.removeEventListener("keydown", handleNumberVote);
  }, [decision, nominations, onVote, canVote]);
  return <section className={styles.console} aria-labelledby="decision-question">
    <div className={styles.consoleHeader}><h2 id="decision-question">{decision.prompt}</h2><Countdown deadline={countdownDeadline} now={() => estimatedNow} mode={countdownMode} /></div>
    <div className={styles.options}>{decision.options.slice(0, 3).map((option, index) => {
      const assignedCharacterId = nominations[option.id] ?? "";
      const hasEligibleActor = !option.assignment || option.assignment.eligibleCharacterIds.length > 0;
      return <div className={styles.optionGroup} key={option.id}>
        <VoteOption index={(index + 1) as 1 | 2 | 3} label={option.label} selected={selectedId === option.id} submitted={submitted && selectedId === option.id} disabled={!canVote || !hasEligibleActor || Boolean(option.assignment && !assignedCharacterId)} onClick={() => option.assignment ? onVote(option.id, assignedCharacterId) : onVote(option.id)} />
        {option.assignment && <label className={styles.nomination}>
          <span>Nominate someone to {option.assignment.roleLabel}</span>
          <select aria-label={`Nominate survivor for ${option.label}`} value={assignedCharacterId} disabled={!canVote || !hasEligibleActor} onChange={(event) => setNominations((current) => ({ ...current, [option.id]: event.target.value }))}>
            <option value="">Choose a living character</option>
            {option.assignment.eligibleCharacterIds.map((characterId) => <option key={characterId} value={characterId}>{characterNames[characterId] ?? characterId}</option>)}
          </select>
          {!hasEligibleActor && <small>No living character can perform this task.</small>}
        </label>}
      </div>;
    })}</div>
    {!canVote && estimatedNow < deadline && <p role="status">Read the situation. Voting opens when the crew is ready.</p>}
    {submitted && canVote && <p className={styles.voteStatus} role="status">Vote received. You can replace it until voting closes.</p>}
  </section>;
}
