import { useEffect, useId, useRef, useState } from "react";
import type { QualitativeRisk } from "../../shared/domain";
import { Countdown } from "../molecules/Countdown";
import styles from "./organisms.module.css";

type AssignmentResponse = "accept" | "try-refuse";

interface ActiveAssignmentView {
  id: string;
  actorCharacterId: string;
  roleLabel: string;
  deadlineAt: number;
}

interface ViewerAssignmentView {
  canRespond: true;
  qualitativeRisk: QualitativeRisk;
}

const riskCopy: Record<QualitativeRisk, string> = {
  favorable: "Your refusal attempt looks favorable.",
  uncertain: "Your refusal attempt could go either way.",
  risky: "Refusing looks risky. If it fails, you still have to do the job.",
};

export function AssignmentResponsePanel({
  assignment,
  actorName,
  viewerAssignment,
  serverClockOffsetMs = 0,
  onRespond = () => undefined,
}: {
  assignment: ActiveAssignmentView;
  actorName: string;
  viewerAssignment?: ViewerAssignmentView;
  serverClockOffsetMs?: number | null;
  onRespond?: (response: AssignmentResponse) => void;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const [estimatedNow, setEstimatedNow] = useState(() => Date.now() + (serverClockOffsetMs ?? 0));
  const [submittedResponse, setSubmittedResponse] = useState<AssignmentResponse>();
  const isOpen = estimatedNow < assignment.deadlineAt;

  useEffect(() => {
    setSubmittedResponse(undefined);
    panelRef.current?.focus();
  }, [assignment.id]);

  useEffect(() => {
    const update = () => setEstimatedNow(Date.now() + (serverClockOffsetMs ?? 0));
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [assignment.deadlineAt, serverClockOffsetMs]);

  const respond = (response: AssignmentResponse) => {
    if (!isOpen) return;
    onRespond(response);
    setSubmittedResponse(response);
  };

  return <section ref={panelRef} tabIndex={-1} className={styles.assignment} aria-labelledby={headingId}>
    <div className={styles.assignmentHeader}>
      <div>
        <p className={styles.assignmentEyebrow}>Compulsory assignment</p>
        <h2 className={styles.heading} id={headingId}>The crew assigned {actorName} to {assignment.roleLabel}.</h2>
      </div>
      <Countdown deadline={assignment.deadlineAt} now={() => estimatedNow} mode="choice" />
    </div>
    {viewerAssignment ? <>
      <p className={styles.assignmentRisk}>{riskCopy[viewerAssignment.qualitativeRisk]}</p>
      <p className={styles.assignmentDefault}>No response before the clock closes means you accept.</p>
      <div className={styles.assignmentActions} role="group" aria-label="Assignment response">
        <button type="button" aria-pressed={submittedResponse === "accept"} data-selected={submittedResponse === "accept"} disabled={!isOpen || Boolean(submittedResponse)} onClick={() => respond("accept")}>Take the job</button>
        <button type="button" aria-pressed={submittedResponse === "try-refuse"} data-selected={submittedResponse === "try-refuse"} disabled={!isOpen || Boolean(submittedResponse)} onClick={() => respond("try-refuse")}>Try to refuse</button>
      </div>
      {submittedResponse && isOpen && <p className={styles.responseStatus} role="status">Response received: {submittedResponse === "accept" ? "take the job" : "try to refuse"}. Waiting for the island to resolve it.</p>}
      {!isOpen && <p className={styles.responseStatus} role="status">Response window closed. The island is resolving what happened.</p>}
    </> : <p className={styles.assignmentWaiting} role="status">Waiting for {actorName} to answer. If they do not respond, they accept the assignment.</p>}
  </section>;
}
