import type { ButtonHTMLAttributes } from "react";
import { CharacterPortrait } from "../atoms/CharacterPortrait";
import styles from "./molecules.module.css";
type VoterPortrait = { playerId: string; playerName: string; characterName: string; characterId?: string; tint: string; modelUrl: string; pending?: boolean };
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { index: number; label: string; selected?: boolean; submitted?: boolean; rejected?: boolean; voters?: VoterPortrait[] };
export function VoteOption({ index, label, selected = false, submitted = false, rejected = false, voters = [], ...props }: Props) {
  return <button className={styles.vote} type="button" data-option={index} data-selected={selected} data-submitted={submitted} data-rejected={rejected} aria-pressed={selected} aria-describedby={rejected ? `vote-${index}-error` : undefined} {...props}>
    <span className={styles.key} aria-hidden="true">{index}</span>
    <span className={styles.voteLabel}>{label}</span>
    <span className={styles.voteMeta}>
      {voters.length > 0 && <span className={styles.voteVoters}>{voters.map((voter) => <span key={voter.playerId} className={styles.voteVoter} data-pending={voter.pending || undefined} role="img" aria-label={`${voter.playerName} (${voter.characterName}) voted for ${label}${voter.pending ? "; sending" : ""}`} title={`${voter.playerName} · ${voter.characterName}`}><CharacterPortrait name={voter.characterName} tint={voter.tint} state="selected" className={styles.votePortrait} characterId={voter.characterId} modelUrl={voter.modelUrl} /></span>)}</span>}
      {submitted && <span className={styles.submittedMark}>LOCKED</span>}
      {rejected ? <small id={`vote-${index}-error`}>Rejected</small> : null}
    </span>
  </button>;
}
