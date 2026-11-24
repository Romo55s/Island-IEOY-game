import { BackButton, RetroButton } from "../../ui/atoms/RetroButton";
import { navigateTo } from "../../app/navigation";
import styles from "./DevToolsScreen.module.css";

const tools = [
  {
    group: "STORY + DECISIONS",
    entries: [
      { title: "Decision tree", path: "/story-map", detail: "Explore campaign branches, encounter links, and game mechanics." },
      { title: "Decision test bench", path: "/decision-test", detail: "Preview decision cards, scene art, cast reactions, and reports." },
      { title: "Encounter preview", path: "/encounter-preview", detail: "Inspect encounter scenes and their presentation states." },
      { title: "Motorboat route preview", path: "/motorboat-route-preview", detail: "Walk through deterministic escape-route snapshots." },
      { title: "Crew feedback preview", path: "/team-feedback", detail: "Review character reactions and dialogue by situation." },
      { title: "Crash choice preview", path: "/crash-choice-preview", detail: "Inspect crash item and rescue choice presentation." },
    ],
  },
  {
    group: "WORLD + INTERFACE",
    entries: [
      { title: "Island sandbox", path: "/sandbox", detail: "Open the 3D island scene and inspect environment assets." },
      { title: "UI lab", path: "/ui-lab", detail: "Review shared game interface components and states." },
      { title: "Sound test", path: "/sound-test", detail: "Check game music, cues, and audio controls." },
    ],
  },
];

export default function DevToolsScreen() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <BackButton href="/">Main menu</BackButton>
      <div className={styles.heading}>
        <p>FLIGHT 404 · OPERATOR CONSOLE</p>
        <h1>Development tools</h1>
        <span>PARTNER ACCESS · GAME TEST DIRECTORY</span>
      </div>
      <div className={styles.counter} aria-label={`${tools.reduce((n, group) => n + group.entries.length, 0)} tools available`}>
        <strong>{String(tools.reduce((n, group) => n + group.entries.length, 0)).padStart(2, "0")}</strong>
        <small>TOOLS</small>
      </div>
    </header>

    <div className={styles.content}>
      <section className={styles.notice} aria-label="Development mode notice">
        <span className={styles.indicator} aria-hidden="true" />
        <p>Operator access active. Choose a test station to open its page. Test stations use local fixtures unless the page says otherwise.</p>
      </section>

      {tools.map((group, groupIndex) => <section className={styles.group} key={group.group} aria-labelledby={`dev-group-${groupIndex}`}>
        <h2 id={`dev-group-${groupIndex}`}><span>{String(groupIndex + 1).padStart(2, "0")}</span>{group.group}</h2>
        <div className={styles.grid}>
          {group.entries.map((entry, index) => <RetroButton
            className={styles.toolButton}
            key={entry.path}
            type="button"
            onClick={() => navigateTo(entry.path)}
          >
            <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.copy}>
              <strong>{entry.title}</strong>
              <small>{entry.detail}</small>
              <code>{entry.path}</code>
            </span>
            <span className={styles.arrow} aria-hidden="true">›</span>
          </RetroButton>)}
        </div>
      </section>)}

      <footer className={styles.footer}>BLACK BOX 01 <span>·</span> PARTNER PLAYGROUND</footer>
    </div>
  </main>;
}
