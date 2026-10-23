import { useEffect, useId, useRef, useState } from "react";
import type { PrivateChoiceOptionId, PublicMotorboatRouteState, QualitativeRisk } from "../../shared/domain";
import { Countdown } from "../molecules/Countdown";
import { deriveLaunchRisk } from "./MotorboatStatusPanel";
import styles from "./organisms.module.css";

export interface ActivePrivateChoiceView {
  id: string;
  kind: "fuel-discovery" | "launch-custodian";
  deadlineAt: number;
  publicActorCharacterId?: string;
}

export interface ViewerPrivateChoiceView {
  canRespond: true;
  optionIds: PrivateChoiceOptionId[];
  transferableTargetCharacterIds?: string[];
}

const riskLabel: Record<QualitativeRisk, string> = {
  favorable: "Favorable",
  uncertain: "Uncertain",
  risky: "Risky",
};

const optionLabels: Record<PrivateChoiceOptionId, string> = {
  share: "Share it with camp",
  hide: "Hide it",
  transfer: "Give it privately",
  wake: "Wake the group",
  solo: "Leave alone now",
  quiet: "Keep quiet and let the tide pass",
};

function publicHeading(choice: ActivePrivateChoiceView, actorName?: string): string {
  if (choice.kind === "fuel-discovery") return "Someone found the motorboat’s sealed fuel can.";
  return `${actorName ?? "The night custodian"} has the last good tide.`;
}

function waitingCopy(choice: ActivePrivateChoiceView, actorName?: string): string {
  if (choice.kind === "fuel-discovery") return "Waiting for the finder. If they do not answer, the fuel will be shared with camp.";
  return `Waiting for ${actorName ?? "the night custodian"}. If they do not answer, the group will be awakened.`;
}

export function PrivateChoicePanel({
  choice,
  viewerChoice,
  actorName,
  characterNames = {},
  motorboat,
  serverClockOffsetMs = 0,
  onRespond = () => undefined,
}: {
  choice: ActivePrivateChoiceView;
  viewerChoice?: ViewerPrivateChoiceView;
  actorName?: string;
  characterNames?: Record<string, string>;
  motorboat?: PublicMotorboatRouteState;
  serverClockOffsetMs?: number | null;
  onRespond?: (optionId: PrivateChoiceOptionId, transferTargetCharacterId?: string) => void;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const [estimatedNow, setEstimatedNow] = useState(() => Date.now() + (serverClockOffsetMs ?? 0));
  const [transferTargetId, setTransferTargetId] = useState("");
  const [submittedOptionId, setSubmittedOptionId] = useState<string>();
  const isOpen = estimatedNow < choice.deadlineAt;

  useEffect(() => {
    setTransferTargetId("");
    setSubmittedOptionId(undefined);
    panelRef.current?.focus();
  }, [choice.id]);

  useEffect(() => {
    const update = () => setEstimatedNow(Date.now() + (serverClockOffsetMs ?? 0));
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [choice.deadlineAt, serverClockOffsetMs]);

  const submit = (optionId: PrivateChoiceOptionId) => {
    if (!isOpen || submittedOptionId) return;
    if (optionId === "transfer" && !transferTargetId) return;
    onRespond(optionId, optionId === "transfer" ? transferTargetId : undefined);
    setSubmittedOptionId(optionId);
  };

  const launchRisk = choice.kind === "launch-custodian" && motorboat ? deriveLaunchRisk(motorboat, "solo") : undefined;

  return <section ref={panelRef} tabIndex={-1} className={styles.privateChoice} aria-labelledby={headingId}>
    <div className={styles.assignmentHeader}>
      <div>
        <p className={styles.assignmentEyebrow}>{choice.kind === "fuel-discovery" ? "Private discovery" : "Last good tide"}</p>
        <h2 className={styles.heading} id={headingId}>{publicHeading(choice, actorName)}</h2>
      </div>
      <Countdown deadline={choice.deadlineAt} now={() => estimatedNow} mode="choice" />
    </div>
    {viewerChoice ? <>
      {launchRisk && <section className={styles.riskSummary} aria-label="Launch risk">
        <strong>{riskLabel[launchRisk.level]} solo launch</strong>
        <ul>{launchRisk.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      </section>}
      <p className={styles.assignmentDefault}>{choice.kind === "fuel-discovery" ? "No response means the fuel is shared with camp." : "No response means you wake the group."}</p>
      <div className={styles.privateChoiceActions} role="group" aria-label="Private choice">
        {viewerChoice.optionIds.map((optionId) => <div className={styles.privateChoiceOption} key={optionId}>
          {optionId === "transfer" && <label>
            <span>Give the fuel to</span>
            <select aria-label="Fuel transfer target" value={transferTargetId} disabled={!isOpen || Boolean(submittedOptionId)} onChange={(event) => setTransferTargetId(event.target.value)}>
              <option value="">Choose a living character</option>
              {(viewerChoice.transferableTargetCharacterIds ?? []).map((characterId) => <option key={characterId} value={characterId}>{characterNames[characterId] ?? characterId}</option>)}
            </select>
          </label>}
          <button type="button" aria-pressed={submittedOptionId === optionId} data-selected={submittedOptionId === optionId} disabled={!isOpen || Boolean(submittedOptionId) || optionId === "transfer" && !transferTargetId} onClick={() => submit(optionId)}>{optionLabels[optionId]}</button>
        </div>)}
      </div>
      {submittedOptionId && <p className={styles.responseStatus} role="status">Private choice received. Waiting for the island to resolve it.</p>}
      {!isOpen && !submittedOptionId && <p className={styles.responseStatus} role="status">Choice window closed. The safe default is being resolved.</p>}
    </> : <p className={styles.assignmentWaiting} role="status">{waitingCopy(choice, actorName)}</p>}
  </section>;
}
