import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CharacterDefinition, Player, PrivateChoiceOptionId, PublicMotorboatRouteState, QualitativeRisk } from "../../shared/domain";
import { Countdown } from "../molecules/Countdown";
import { CharacterNominationModal } from "./CharacterNominationModal";
import { deriveLaunchRisk } from "./MotorboatStatusPanel";
import styles from "./organisms.module.css";

export interface ActivePrivateChoiceView {
  id: string;
  kind: "fuel-discovery" | "launch-custodian" | "night-hunger";
  deadlineAt: number;
  publicActorCharacterId?: string;
}

export interface ViewerPrivateChoiceView {
  canRespond: true;
  optionIds: PrivateChoiceOptionId[];
  transferableTargetCharacterIds?: string[];
  targetCharacterIds?: string[];
}

const riskLabel: Record<QualitativeRisk, string> = {
  favorable: "Favorable",
  uncertain: "Uncertain",
  risky: "Risky",
};

const optionLabels: Record<PrivateChoiceOptionId, string> = {
  sleep: "Sleep",
  "attempt-eat": "Try to eat someone · Very risky",
  share: "Share it with camp",
  hide: "Hide it",
  transfer: "Give it privately",
  wake: "Wake the group",
  solo: "Leave alone now",
  quiet: "Keep quiet and let the tide pass",
};

function publicHeading(choice: ActivePrivateChoiceView, actorName?: string): string {
  if (choice.kind === "night-hunger") return "The crew settles down to sleep at camp.";
  if (choice.kind === "fuel-discovery") return "Someone found the motorboat’s sealed fuel can.";
  return `${actorName ?? "The night custodian"} has the last good tide.`;
}

function waitingCopy(choice: ActivePrivateChoiceView, actorName?: string): string {
  if (choice.kind === "night-hunger") return "Night falls over camp. Waiting for morning.";
  if (choice.kind === "fuel-discovery") return "Waiting for the finder. If they do not answer, the fuel will be shared with camp.";
  return `Waiting for ${actorName ?? "the night custodian"}. If they do not answer, the group will be awakened.`;
}

export function PrivateChoicePanel({
  choice,
  viewerChoice,
  actorName,
  characterNames = {},
  players = [],
  characterCatalog = [],
  motorboat,
  serverClockOffsetMs = 0,
  onRespond = () => undefined,
  layout = "default",
}: {
  choice: ActivePrivateChoiceView;
  viewerChoice?: ViewerPrivateChoiceView;
  actorName?: string;
  characterNames?: Record<string, string>;
  players?: Player[];
  characterCatalog?: CharacterDefinition[];
  motorboat?: PublicMotorboatRouteState;
  serverClockOffsetMs?: number | null;
  onRespond?: (optionId: PrivateChoiceOptionId, transferTargetCharacterId?: string) => void;
  layout?: "default" | "story";
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const transferTriggerRef = useRef<HTMLButtonElement>(null);
  const [estimatedNow, setEstimatedNow] = useState(() => Date.now() + (serverClockOffsetMs ?? 0));
  const [transferTargetId, setTransferTargetId] = useState("");
  const [pendingTransferTargetId, setPendingTransferTargetId] = useState("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [submittedOptionId, setSubmittedOptionId] = useState<string>();
  const isOpen = estimatedNow < choice.deadlineAt;
  const countdownNow = useCallback(() => Date.now() + (serverClockOffsetMs ?? 0), [serverClockOffsetMs]);

  useEffect(() => {
    setTransferTargetId("");
    setPendingTransferTargetId("");
    setTransferModalOpen(false);
    setSubmittedOptionId(undefined);
    panelRef.current?.focus();
  }, [choice.id]);

  useEffect(() => {
    const update = () => setEstimatedNow(Date.now() + (serverClockOffsetMs ?? 0));
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [choice.deadlineAt, serverClockOffsetMs]);

  const night = choice.kind === "night-hunger";
  const targetIds = night ? viewerChoice?.targetCharacterIds : viewerChoice?.transferableTargetCharacterIds;
  const needsTarget = (id: PrivateChoiceOptionId) => id === "transfer" || id === "attempt-eat";

  const submit = (optionId: PrivateChoiceOptionId) => {
    if (!isOpen || submittedOptionId) return;
    if (needsTarget(optionId) && !transferTargetId) return;
    onRespond(optionId, needsTarget(optionId) ? transferTargetId : undefined);
    setSubmittedOptionId(optionId);
  };

  const launchRisk = choice.kind === "launch-custodian" && motorboat ? deriveLaunchRisk(motorboat, "solo") : undefined;

  return <section ref={panelRef} tabIndex={-1} className={styles.privateChoice} data-layout={layout} aria-labelledby={headingId}>
    <div className={styles.assignmentHeader}>
      <div>
        <p className={styles.assignmentEyebrow}>{night ? "Camp night" : choice.kind === "fuel-discovery" ? "Private discovery" : "Last good tide"}</p>
        <h2 className={styles.heading} id={headingId}>{publicHeading(choice, actorName)}</h2>
      </div>
      <Countdown deadline={choice.deadlineAt} now={countdownNow} mode="choice" />
    </div>
    {viewerChoice ? <>
      {launchRisk && <section className={styles.riskSummary} aria-label="Launch risk">
        <strong>{riskLabel[launchRisk.level]} solo launch</strong>
        <ul>{launchRisk.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      </section>}
      <p className={styles.assignmentDefault}>{night ? "You are starving. An attempt can kill the target, injure you, and will be revealed to everyone. No response means you sleep." : choice.kind === "fuel-discovery" ? "No response means the fuel is shared with camp." : "No response means you wake the group."}</p>
      <div className={styles.privateChoiceActions} role="group" aria-label="Private choice">
        {viewerChoice.optionIds.map((optionId) => <div className={styles.privateChoiceOption} key={optionId}>
          {needsTarget(optionId) && <div className={styles.nomination}>
            <span>{night ? "Choose the intended victim" : "Give the fuel to"}</span>
            <button
              ref={transferTriggerRef}
              type="button"
              className={styles.nominationTrigger}
              aria-haspopup="dialog"
              aria-expanded={transferModalOpen}
              aria-label={night ? "Choose a living target" : "Choose a living character to receive the fuel"}
              disabled={!isOpen || Boolean(submittedOptionId) || !(targetIds?.length)}
              onClick={() => {
                setPendingTransferTargetId(transferTargetId);
                setTransferModalOpen(true);
              }}
            >
              <span>{transferTargetId ? characterNames[transferTargetId] ?? transferTargetId : "Choose a living character"}</span>
              <span className={styles.nominationAction}>{transferTargetId ? "Change" : "Select"}</span>
            </button>
            {transferModalOpen && isOpen && !submittedOptionId && <CharacterNominationModal
              selectionKind={night ? "target" : "assignment"}
              description={night ? "Only you can see this target until an attempt resolves. Sleeping reveals no target." : "Choose another living character. This fuel transfer stays private."}
              roleLabel={night ? "Choose the intended victim" : "receive the fuel"}
              players={players}
              characterCatalog={characterCatalog}
              eligibleCharacterIds={targetIds ?? []}
              selectedCharacterId={pendingTransferTargetId}
              onSelect={setPendingTransferTargetId}
              onCancel={() => {
                setTransferModalOpen(false);
                window.requestAnimationFrame(() => transferTriggerRef.current?.focus());
              }}
              onConfirm={() => {
                if (!targetIds?.includes(pendingTransferTargetId)) return;
                setTransferTargetId(pendingTransferTargetId);
                setTransferModalOpen(false);
                window.requestAnimationFrame(() => transferTriggerRef.current?.focus());
              }}
            />}
          </div>}
          <button type="button" aria-pressed={submittedOptionId === optionId} data-option={optionId} data-selected={submittedOptionId === optionId} disabled={!isOpen || Boolean(submittedOptionId) || needsTarget(optionId) && !transferTargetId} onClick={() => submit(optionId)}>{optionLabels[optionId]}</button>
        </div>)}
      </div>
      {submittedOptionId && <p className={styles.responseStatus} role="status" aria-live="polite">Private choice received. Waiting for the island to resolve it.</p>}
      {!isOpen && !submittedOptionId && <p className={styles.responseStatus} role="status">Choice window closed. The safe default is being resolved.</p>}
    </> : <p className={styles.assignmentWaiting} role="status">{waitingCopy(choice, actorName)}</p>}
  </section>;
}
