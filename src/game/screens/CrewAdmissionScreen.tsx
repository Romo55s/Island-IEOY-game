import { useId, useState } from "react";
import { createSession, joinSession } from "../../client/sessionApi";
import { savePendingAdmission } from "../../client/sessionStorage";
import { navigateTo } from "../../app/navigation";
import { BackButton, RetroButton } from "../../ui/atoms/RetroButton";
import styles from "./CrewAdmissionScreen.module.css";

export type CrewAdmissionMode = "create" | "join";

type CrewAdmissionScreenProps = {
  mode: CrewAdmissionMode;
};

const copy = {
  create: {
    eyebrow: "FLIGHT 404 · CREW SESSION",
    title: "Start a crew",
    description: "Choose a callsign and create a lobby. Share its boarding code so the crew can join.",
    panelTitle: "Crew manifest",
    help: "Anyone with the code can join while the lobby is open.",
    submit: "Create crew session",
    submitting: "Creating session…",
  },
  join: {
    eyebrow: "FLIGHT 404 · BOARDING ACCESS",
    title: "Join a crew",
    description: "Enter the crew’s boarding code and choose a callsign to board.",
    panelTitle: "Boarding details",
    help: "You can join while the host’s lobby is open.",
    submit: "Join session",
    submitting: "Joining session…",
  },
} as const;

/** A route-level admission screen shared by /start-crew and /join-crew. */
export function CrewAdmissionScreen({ mode }: CrewAdmissionScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorId = useId();
  const text = copy[mode];

  async function submit() {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const admission = mode === "create"
        ? await createSession({ displayName })
        : await joinSession({ code, displayName });
      savePendingAdmission(admission);
      navigateTo("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not enter the session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return <main className={styles.page}>
    <section className={styles.content} aria-labelledby={`${mode}-crew-title`}>
      <header className={styles.introduction}>
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        <h1 id={`${mode}-crew-title`}>{text.title}</h1>
        <p>{text.description}</p>
      </header>

      <form className={styles.form} aria-labelledby={`${mode}-credentials`} aria-busy={isSubmitting} data-error={Boolean(error)} onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}>
        <p className={styles.panelHeader} id={`${mode}-credentials`}>{text.panelTitle}</p>
        <div className={styles.formBody}>
          {mode === "join" && <label>
            Six-character boarding code
            <input className={styles.codeInput} aria-label="Room code" aria-describedby={error ? errorId : undefined} autoComplete="off" autoFocus value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} disabled={isSubmitting} required minLength={6} maxLength={6} />
          </label>}
          <label>
            Callsign
            <input aria-label={mode === "create" ? "Your name" : "Joining name"} aria-describedby={error ? errorId : undefined} autoComplete="nickname" autoFocus={mode === "create"} value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={isSubmitting} required maxLength={24} />
          </label>
          <p className={styles.fieldHint}>{text.help}</p>
          {error && <p className={styles.validationMessage} id={errorId} role="alert">{error}</p>}
          <RetroButton className={styles.submitButton} type="submit" tone="primary" disabled={isSubmitting}>
            {isSubmitting && <span className={styles.loadingMark} aria-hidden="true" />}
            {isSubmitting ? text.submitting : text.submit}
          </RetroButton>
        </div>
      </form>

      <footer className={styles.footer}>
        <BackButton className={styles.backButton} href="/">Back</BackButton>
      </footer>
    </section>
  </main>;
}
