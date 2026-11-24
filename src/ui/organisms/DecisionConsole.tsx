import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHARACTER_CATALOG, type CharacterDefinition, type Player, type PublicDecision, type PublicLiveVote } from "../../shared/domain";
import { Countdown } from "../molecules/Countdown";
import { VoteOption } from "../molecules/VoteOption";
import { CharacterNominationModal } from "./CharacterNominationModal";
import styles from "./organisms.module.css";
export function DecisionConsole({ decision, deadline, votingOpensAt, serverClockOffsetMs = 0, selectedId, submitted = false, submitting = false, characterNames = {}, characterCatalog = [], liveVotes = [], eligibleVoterIds = [], players = [], pendingVoterId, onVote = () => {}, layout = "default" }: { decision: PublicDecision; deadline: number; votingOpensAt?: number | null; serverClockOffsetMs?: number | null; selectedId?: string; submitted?: boolean; submitting?: boolean; characterNames?: Record<string, string>; characterCatalog?: CharacterDefinition[]; liveVotes?: PublicLiveVote[]; eligibleVoterIds?: string[]; players?: Player[]; pendingVoterId?: string; onVote?: (id: string, assignedCharacterId?: string, targetCharacterId?: string) => void; layout?: "default" | "story" }) {
  const [estimatedNow, setEstimatedNow] = useState(() => Date.now() + (serverClockOffsetMs ?? 0));
  const [nominations, setNominations] = useState<Record<string, string>>({});
  const [nominationOptionId, setNominationOptionId] = useState<string | null>(null);
  const [pendingNomineeId, setPendingNomineeId] = useState("");
  const nominationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const hasReadingWindow = votingOpensAt != null;
  const canVote = (!hasReadingWindow || estimatedNow >= votingOpensAt) && estimatedNow < deadline;
  const countdownDeadline = canVote || !hasReadingWindow ? deadline : votingOpensAt;
  const countdownMode = canVote || !hasReadingWindow ? "vote" : "reading";
  const countdownNow = useCallback(() => Date.now() + (serverClockOffsetMs ?? 0), [serverClockOffsetMs]);
  const characterById = useMemo(() => {
    const characters = new Map(CHARACTER_CATALOG.map((character) => [character.id, character]));
    for (const character of characterCatalog) characters.set(character.id, character);
    return characters;
  }, [characterCatalog]);
  const mergedCharacterCatalog = useMemo(() => [...characterById.values()], [characterById]);
  useEffect(() => {
    setEstimatedNow(Date.now() + (serverClockOffsetMs ?? 0));
    const timer = window.setInterval(() => setEstimatedNow(Date.now() + (serverClockOffsetMs ?? 0)), 200);
    return () => window.clearInterval(timer);
  }, [serverClockOffsetMs, votingOpensAt, deadline]);
  useEffect(() => setNominations({}), [decision.id]);
  useEffect(() => {
    if (!canVote) setNominationOptionId(null);
  }, [canVote]);
  useEffect(() => {
    const handleNumberVote = (event: KeyboardEvent) => {
      if (!canVote || nominationOptionId || submitting || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = Number(event.key) - 1;
      const option = decision.options[index];
      if (!option || index < 0 || index > 8) return;
      event.preventDefault();
      const assignedCharacterId = nominations[option.id];
      if ((option.assignment || option.targetSelection) && !assignedCharacterId) return;
      if (option.targetSelection) onVote(option.id, undefined, assignedCharacterId);
      else if (option.assignment) onVote(option.id, assignedCharacterId);
      else onVote(option.id);
    };
    window.addEventListener("keydown", handleNumberVote);
    return () => window.removeEventListener("keydown", handleNumberVote);
  }, [decision, nominations, nominationOptionId, onVote, canVote, submitting]);
  return <section className={styles.console} data-layout={layout} aria-labelledby="decision-question">
    <div className={styles.consoleHeader}><h2 id="decision-question">{decision.prompt}</h2><Countdown deadline={countdownDeadline} now={countdownNow} mode={countdownMode} /></div>
    <div className={styles.options}>{decision.options.map((option, index) => {
      const assignedCharacterId = nominations[option.id] ?? "";
      const selection = option.assignment ?? (option.targetSelection ? { roleLabel: option.targetSelection.label, eligibleCharacterIds: option.targetSelection.eligibleCharacterIds } : undefined);
      const hasEligibleActor = !selection || selection.eligibleCharacterIds.length > 0;
      const voters = liveVotes.filter(({ optionId }) => optionId === option.id).flatMap((vote) => {
        const player = players.find(({ id }) => id === vote.playerId);
        if (!player) return [];
        const character = player.characterId ? characterById.get(player.characterId) : undefined;
        return [{ playerId: player.id, playerName: player.displayName, characterName: character?.displayName ?? (player.characterId ? characterNames[player.characterId] : undefined) ?? "Crew", characterId: player.characterId ?? undefined, tint: character?.tint ?? "#746b5d", modelUrl: character?.modelUrl ?? "", pending: vote.playerId === pendingVoterId }];
      });
      return <div className={styles.optionGroup} key={option.id}>
        <VoteOption index={index + 1} label={option.label} voters={voters} selected={selectedId === option.id} submitted={submitted && selectedId === option.id} disabled={!canVote || submitting || !hasEligibleActor || Boolean(selection && !assignedCharacterId)} onClick={() => option.targetSelection ? onVote(option.id, undefined, assignedCharacterId) : selection ? onVote(option.id, assignedCharacterId) : onVote(option.id)} />
        {selection && <div className={styles.nomination}>
          <span>{option.targetSelection ? selection.roleLabel : `Nominate someone to ${selection.roleLabel}`}</span>
          <button
            ref={nominationOptionId === option.id ? nominationTriggerRef : undefined}
            type="button"
            className={styles.nominationTrigger}
            aria-haspopup="dialog"
            aria-expanded={nominationOptionId === option.id}
            aria-label={`${option.targetSelection ? "Choose target" : "Nominate survivor"} for ${option.label}`}
            disabled={!canVote || !hasEligibleActor}
            onClick={() => {
              setPendingNomineeId(assignedCharacterId);
              setNominationOptionId(option.id);
            }}
          >
            <span>{assignedCharacterId ? characterNames[assignedCharacterId] ?? characterById.get(assignedCharacterId)?.displayName ?? assignedCharacterId : "Choose a living character"}</span>
            <span className={styles.nominationAction}>{assignedCharacterId ? "Change" : "Select"}</span>
          </button>
          {!hasEligibleActor && <small>No living character can perform this task.</small>}
          {nominationOptionId === option.id && <CharacterNominationModal
            selectionKind={option.targetSelection ? "target" : "assignment"}
            roleLabel={selection.roleLabel}
            players={players}
            characterCatalog={mergedCharacterCatalog}
            eligibleCharacterIds={selection.eligibleCharacterIds}
            selectedCharacterId={pendingNomineeId}
            onSelect={setPendingNomineeId}
            onCancel={() => {
              setNominationOptionId(null);
              window.requestAnimationFrame(() => nominationTriggerRef.current?.focus());
            }}
            onConfirm={() => {
              if (!selection?.eligibleCharacterIds.includes(pendingNomineeId)) return;
              setNominations((current) => ({ ...current, [option.id]: pendingNomineeId }));
              setNominationOptionId(null);
              window.requestAnimationFrame(() => nominationTriggerRef.current?.focus());
            }}
          />}
        </div>}
      </div>;
    })}</div>
    {!canVote && estimatedNow < deadline && <p role="status">Read the situation. Voting opens when the crew is ready.</p>}
    {submitting && !submitted && <p className={styles.voteStatus} role="status">Sending your vote…</p>}
    {submitted && canVote && <p className={styles.voteStatus} role="status">Vote received. Change it any time before the last ballot is cast.</p>}
    {liveVotes.length > 0 && <section className={styles.liveBallots} aria-label="Visible group votes" aria-live="polite">
      <header><h3>Live crew votes</h3><span>{liveVotes.length}/{eligibleVoterIds.length} cast</span></header>
      <ul>{liveVotes.map((vote) => {
        const player = players.find(({ id }) => id === vote.playerId);
        const option = decision.options.find(({ id }) => id === vote.optionId);
        const nomineeId = vote.targetCharacterId ?? vote.assignedCharacterId;
        const nominee = nomineeId ? characterNames[nomineeId] ?? nomineeId : undefined;
        return <li key={vote.playerId}><b>{player?.displayName ?? "Crew member"}</b><span>{option?.label ?? "Vote recorded"}{nominee ? ` · ${nominee}` : ""}</span></li>;
      })}</ul>
      <p>Group votes are public. Selfish personal choices stay private.</p>
    </section>}
  </section>;
}
