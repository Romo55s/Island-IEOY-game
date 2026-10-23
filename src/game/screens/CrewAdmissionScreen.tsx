import { useId, useState } from "react";
import { createSession, joinSession } from "../../client/sessionApi";
import { savePendingAdmission } from "../../client/sessionStorage";
import styles from "./CrewAdmissionScreen.module.css";

export type CrewAdmissionMode = "create" | "join";

type CrewAdmissionScreenProps = {
  mode: CrewAdmissionMode;
};

const copy = {
  create: {
    eyebrow: "FLIGHT 404 · PRIVATE CREW SESSION",
    title: "Start a crew",
    description: "Choose a callsign and secure the flight manifest. You will receive a boarding code to share with the crew.",
    panelTitle: "Crew credentials",
    help: "Use at least four characters. The boarding code appears after the session is created.",
    submit: "Create private session",
    submitting: "Creating session…",
  },
  join: {
    eyebrow: "FLIGHT 404 · BOARDING ACCESS",
    title: "Join a crew",
    description: "Enter the host’s boarding code and private password, then choose a survivor in the lobby.",
    panelTitle: "Boarding credentials",
    help: "The boarding code and password must match the host’s private session.",
    submit: "Join session",
    submitting: "Joining session…",
  },
} as const;

/** A route-level admission screen shared by /start-crew and /join-crew. */
export function CrewAdmissionScreen({ mode }: CrewAdmissionScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
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
        ? await createSession({ displayName, password })
        : await joinSession({ code, displayName, password });
      savePendingAdmission(admission);
      window.location.assign("/");
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
          <label>
            Room password
            <input aria-label={mode === "create" ? "Room password" : "Joining password"} aria-describedby={error ? errorId : undefined} autoComplete={mode === "create" ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} required minLength={4} maxLength={64} />
          </label>
          <p className={styles.fieldHint}>{text.help}</p>
          {error && <p className={styles.validationMessage} id={errorId} role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting && <span className={styles.loadingMark} aria-hidden="true" />}
            {isSubmitting ? text.submitting : text.submit}
          </button>
        </div>
      </form>

      <footer className={styles.footer}>
        <button className={styles.backButton} type="button" onClick={() => window.location.assign("/")}>Back</button>
        <a className={styles.devLink} href="/sandbox">Open island sandbox <span>DEV</span></a>
      </footer>
    </section>
  </main>;
}
