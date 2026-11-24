import { useEffect, useRef, useState } from "react";
import { BackButton, RetroButton } from "../../ui/atoms/RetroButton";
import {
  STORY_MAP_COUNTS,
  type MapMode,
  type StoryMapNodeSpec,
} from "./storyMapData";
import styles from "./StoryMapChrome.module.css";

interface StoryMapChromeProps {
  mode: MapMode;
  decisions: StoryMapNodeSpec[];
  focusDecisionId: string;
  focusDecisionTitle: string;
  showFullGraph: boolean;
  onModeChange: (mode: MapMode) => void;
  onFocusDecisionChange: (decisionId: string) => void;
  onToggleFullGraph: () => void;
}

const modeLabel: Record<MapMode, string> = {
  route: "Campaign route",
  encounters: "Encounter cards",
  mechanics: "Game mechanics",
};

export function StoryMapChrome({
  mode,
  decisions,
  focusDecisionId,
  focusDecisionTitle,
  showFullGraph,
  onModeChange,
  onFocusDecisionChange,
  onToggleFullGraph,
}: StoryMapChromeProps) {
  const [open, setOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !controlsRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        controlsRef.current
          ?.querySelector<HTMLButtonElement>("[aria-expanded]")
          ?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={styles.headerMain}>
        <BackButton href="/" className={styles.back}>
          Title menu
        </BackButton>
        <div className={styles.heading}>
          <p>DEVELOPMENT TOOL · LIVE RULES</p>
          <h1>Story &amp; mechanics map</h1>
          <span>
            {modeLabel[mode]}
            {focusDecisionTitle
              ? ` / ${focusDecisionTitle}`
              : " / All mechanics"}
          </span>
        </div>
        <div className={styles.counts} aria-label="Story map contents">
          <span className={styles.count}>
            <strong>{STORY_MAP_COUNTS.routeDecisions}</strong>
            <small>routes</small>
          </span>
          <span className={styles.count}>
            <strong>{STORY_MAP_COUNTS.encounterDecisions}</strong>
            <small>encounters</small>
          </span>
          <span className={styles.count}>
            <strong>{STORY_MAP_COUNTS.mechanics}</strong>
            <small>rules</small>
          </span>
        </div>
        <div className={styles.controls} ref={controlsRef}>
          <RetroButton
            type="button"
            className={styles.controlsTrigger}
            aria-expanded={open}
            aria-controls="story-map-controls-panel"
            onClick={() => setOpen((value) => !value)}
          >
            <span className={styles.triggerGlyph} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>Map controls</span>
          </RetroButton>
          {open && (
            <section
              className={styles.controlPanel}
              id="story-map-controls-panel"
              aria-label="Map controls"
            >
              <div className={styles.panelHeader}>
                <h2>Map controls</h2>
                <button
                  className={styles.closePanel}
                  type="button"
                  aria-label="Close map controls"
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.controlBody}>
                <div
                  className={styles.viewGroup}
                  role="group"
                  aria-label="Map view"
                >
                  {(Object.keys(modeLabel) as MapMode[]).map((key) => (
                    <RetroButton
                      key={key}
                      type="button"
                      className={styles.viewButton}
                      tone={mode === key ? "primary" : "default"}
                      aria-pressed={mode === key}
                      onClick={() => onModeChange(key)}
                    >
                      {modeLabel[key]}
                    </RetroButton>
                  ))}
                </div>
                {decisions.length > 0 && (
                  <label className={styles.focusDecision}>
                    <span>Jump to decision</span>
                    <span className={styles.selectShell}>
                      <select
                        aria-label="Jump to decision"
                        value={focusDecisionId}
                        onChange={(event) =>
                          onFocusDecisionChange(event.target.value)
                        }
                      >
                        {decisions.map(({ id, data }) => (
                          <option key={id} value={id}>
                            {data.title}
                          </option>
                        ))}
                      </select>
                      <span className={styles.selectArrow} aria-hidden="true" />
                    </span>
                  </label>
                )}
                {mode !== "mechanics" && (
                  <RetroButton
                    type="button"
                    className={styles.scopeButton}
                    tone={showFullGraph ? "primary" : "default"}
                    aria-pressed={showFullGraph}
                    onClick={onToggleFullGraph}
                  >
                    {showFullGraph ? "Focus decision" : "Show full map"}
                  </RetroButton>
                )}
              </div>
              <p className={styles.help}>
                Drag cards to arrange; positions snap to the grid. Hold Shift and
                drag across the canvas to select cards together.
              </p>
            </section>
          )}
        </div>
      </div>
    </header>
  );
}
