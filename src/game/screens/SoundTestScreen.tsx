import { useEffect, useState, useSyncExternalStore } from "react";
import { BackButton, RetroButton } from "../../ui/atoms/RetroButton";
import { SettingsDrawer } from "../../ui/organisms/SettingsDrawer";
import { getPlayingSounds, playSound, requestDecisionMusic, requestEndingMusic, requestMenuMusic, requestMenuMusicPreview, stopAllSounds, stopSound, subscribeSoundPlayback, unlockAudio } from "../../audio/audioSystem";
import { SOUND_CUES } from "../../audio/soundCatalog";
import type { SoundCueId } from "../../audio/soundCatalog";
import type { DecisionMusicTheme } from "../../audio/decisionMusic";
import type { EndingMusicKind } from "../../audio/endingMusic";
import styles from "./SoundTestScreen.module.css";

const EMPTY_PLAYING = new Set<SoundCueId>();
const DECISION_THEMES: Array<{ id: DecisionMusicTheme; label: string; description: string }> = [
  { id: "survival", label: "Survival", description: "Low, widely spaced fragments and a hanging A7" },
  { id: "signal", label: "Signal for help", description: "High beacon calls over open fifths and sustained intervals" },
  { id: "escape", label: "Escape attempt", description: "A 142 BPM bass chase with a clipped motif ostinato" },
];
const ENDING_THEMES: Array<{ id: EndingMusicKind; label: string; description: string }> = [
  { id: "victory", label: "Crew escaped · Win", description: "A D-major lift reshapes the title motif into a clear resolution" },
  { id: "defeat", label: "Crew lost · Loss", description: "A slow 42 BPM dirge that returns to the title’s unresolved A7" },
];

export function SoundTestScreen() {
  const playing = useSyncExternalStore(subscribeSoundPlayback, getPlayingSounds, () => EMPTY_PLAYING);
  const [menuScorePreviewPlaying, setMenuScorePreviewPlaying] = useState(false);
  const [decisionPreviewTheme, setDecisionPreviewTheme] = useState<DecisionMusicTheme | null>(null);
  const [endingPreviewKind, setEndingPreviewKind] = useState<EndingMusicKind | null>(null);
  useEffect(() => () => {
    stopAllSounds();
    requestMenuMusic(true);
  }, []);
  const cueGroups = [...new Set(SOUND_CUES.map(({ group }) => group))];
  const toggleCue = (id: SoundCueId, loop: boolean) => {
    unlockAudio();
    if (loop && playing.has(id)) stopSound(id);
    else playSound(id);
  };

  return <main className={styles.page}>
    <header className={styles.header}>
      <BackButton href="/" data-sfx="none">Back to game</BackButton>
      <div className={styles.titleBlock}>
        <p>FLIGHT 404 · AUDIO RECORDER</p>
        <h1>Sound test</h1>
      <span>Tone.js playback · Meta Piano samples · Kenney CC0 effects</span>
      </div>
    </header>
    <div className={styles.workbench}>
      <section className={styles.soundPanel} aria-labelledby="cue-bank-title">
        <header className={styles.panelHeader}><span>BLACK BOX 02</span><h2 id="cue-bank-title">Cue bank</h2></header>
        <div className={styles.panelBody}>
          <p className={styles.intro}>Audition the title score, sampled-piano gameplay themes, island and Foley effects, and selected Kenney CC0 sounds. The decision and ending themes use locally bundled Meta Piano recordings; Crew radio is synthetic and contains no intelligible dialogue.</p>
          <section className={styles.group} aria-labelledby="tone-score-heading">
            <h3 id="tone-score-heading">Current title score · Tone.js</h3>
            <ul>
              <li className={styles.cueRow} data-playing={menuScorePreviewPlaying}>
                <div className={styles.cueCopy}><strong>Island After Impact</strong><p>Eight-bar PS1-style score: a falling motif, uneasy minor harmony, and a restrained answer phrase.</p></div>
                <span className={styles.state} aria-hidden="true">{menuScorePreviewPlaying ? "LOOPING" : "READY"}</span>
                <RetroButton type="button" className={styles.playButton} data-sfx="none" aria-pressed={menuScorePreviewPlaying} onClick={() => {
                  unlockAudio();
                  const nextPlaying = !menuScorePreviewPlaying;
                  if (nextPlaying) {
                    requestDecisionMusic(false);
                    requestEndingMusic(false);
                    setDecisionPreviewTheme(null);
                    setEndingPreviewKind(null);
                  }
                  setMenuScorePreviewPlaying(nextPlaying);
                  requestMenuMusicPreview(nextPlaying);
                }}>{menuScorePreviewPlaying ? "Stop" : "Play"}</RetroButton>
              </li>
            </ul>
          </section>
          <section className={styles.group} aria-labelledby="decision-score-heading">
            <h3 id="decision-score-heading">Decision underscore · sampled piano</h3>
            <p className={styles.themeHint}>The same D-centered musical identity takes a different shape in each scene: sparse and low for survival, high and echoing for a signal, then fast and percussive for escape.</p>
            <div className={styles.themeChoices}>
              {DECISION_THEMES.map(({ id, label, description }) => {
                const isPlaying = decisionPreviewTheme === id;
                return <div className={styles.themeChoice} key={id} data-playing={isPlaying}>
                  <span><strong>{label}</strong><small>{description}</small></span>
                  <RetroButton type="button" className={styles.playButton} data-sfx="none" aria-pressed={isPlaying} onClick={() => {
                    unlockAudio();
                    const nextTheme = isPlaying ? null : id;
                    if (nextTheme) {
                      requestMenuMusicPreview(null);
                      requestEndingMusic(false);
                      setMenuScorePreviewPlaying(false);
                      setEndingPreviewKind(null);
                    }
                    setDecisionPreviewTheme(nextTheme);
                    requestDecisionMusic(Boolean(nextTheme), 0, nextTheme ?? id);
                  }}>{isPlaying ? "Stop" : "Preview"}</RetroButton>
                </div>;
              })}
            </div>
          </section>
          <section className={styles.group} aria-labelledby="ending-score-heading">
            <h3 id="ending-score-heading">Aftermath themes · sampled piano</h3>
            <p className={styles.themeHint}>Victory turns the title motif toward D major; defeat slows its falling shape and ends on the title score’s unresolved A7. Any successful escape counts as a crew win.</p>
            <div className={styles.themeChoices}>
              {ENDING_THEMES.map(({ id, label, description }) => {
                const isPlaying = endingPreviewKind === id;
                return <div className={styles.themeChoice} key={id} data-playing={isPlaying}>
                  <span><strong>{label}</strong><small>{description}</small></span>
                  <RetroButton type="button" className={styles.playButton} data-sfx="none" aria-pressed={isPlaying} onClick={() => {
                    unlockAudio();
                    const nextKind = isPlaying ? null : id;
                    if (nextKind) {
                      requestMenuMusicPreview(null);
                      requestDecisionMusic(false);
                      setMenuScorePreviewPlaying(false);
                      setDecisionPreviewTheme(null);
                    }
                    setEndingPreviewKind(nextKind);
                    requestEndingMusic(Boolean(nextKind), nextKind ?? id);
                  }}>{isPlaying ? "Stop" : "Preview"}</RetroButton>
                </div>;
              })}
            </div>
          </section>
          {cueGroups.map((group) => <section key={group} className={styles.group} aria-labelledby={"group-" + group.toLowerCase()}>
            <h3 id={"group-" + group.toLowerCase()}>{group}</h3>
            <ul>
              {SOUND_CUES.filter((cue) => cue.group === group).map((cue) => {
                const isPlaying = playing.has(cue.id);
                return <li key={cue.id} className={styles.cueRow} data-playing={isPlaying}>
                  <div className={styles.cueCopy}><strong>{cue.label}</strong><p>{cue.description}</p>{"sourceUrl" in cue && cue.sourceUrl && <a href={cue.sourceUrl} target="_blank" rel="noreferrer">{cue.source}</a>}</div>
                  <span className={styles.state} aria-hidden="true">{isPlaying ? cue.loop ? "LOOPING" : "PLAYING" : "READY"}</span>
                  <RetroButton type="button" className={styles.playButton} data-sfx="none" aria-label={(cue.loop && isPlaying ? "Stop " : "Play ") + cue.label} aria-pressed={cue.loop ? isPlaying : undefined} onClick={() => toggleCue(cue.id, cue.loop)}>
                    {cue.loop && isPlaying ? "Stop" : "Play"}
                  </RetroButton>
                </li>;
              })}
            </ul>
          </section>)}
        </div>
      </section>
      <aside className={styles.settingsColumn} aria-label="Sound settings">
        <SettingsDrawer />
        <section className={styles.notePanel}>
          <h2>Recorder notes</h2>
          <p>Effects are short, grainy, and restrained to keep the crew’s decisions in focus.</p>
          <p>Volume levels save in this browser. Audio starts after your first button press.</p>
        </section>
      </aside>
    </div>
  </main>;
}
