import { useEffect, useId, useState, type ReactNode } from "react";
import { Skull } from "pixelarticons/react/Skull.js";
import { Angry } from "pixelarticons/react/Angry.js";
import { Frown } from "pixelarticons/react/Frown.js";
import { RobotFace } from "pixelarticons/react/RobotFace.js";
import { RobotFaceHappy } from "pixelarticons/react/RobotFaceHappy.js";
import { Smile } from "pixelarticons/react/Smile.js";
import { WarningDiamond } from "pixelarticons/react/WarningDiamond.js";
import { MAX_PLAYER_COUNT, type PublicGameSnapshot } from "../../shared/domain";
import { CharacterPortrait } from "../../ui/atoms/CharacterPortrait";
import { LobbyRoster } from "../../ui/organisms/LobbyRoster";
import { toSessionScenePresentation } from "../../scene/sessionPresentation";
import { getIncidentPresentation, type IncidentPresentation } from "../story/incidentPresentation";
import { CharacterPortraitCanvasLayer } from "../../ui/atoms/CharacterModelPortrait";
import { CharacterInspectorModal } from "../../ui/organisms/CharacterInspectorModal";
import { CrewHistoryPanel } from "../../ui/organisms/CrewHistoryPanel";
import { useDialoguePlayback } from "../story/useDialoguePlayback";
import styles from "./StoryIncidentRoom.module.css";

const emotionIcons = { neutral: RobotFace, happy: Smile, sad: Frown, afraid: WarningDiamond, angry: Angry, relieved: RobotFaceHappy };

function CrewVoice({ member, characterName, onInspect, text, visibleText, speaking = false, reducedMotion = false, sequential = false }: { member: ReturnType<typeof toSessionScenePresentation>["members"][number]; characterName: string; onInspect: () => void; text?: string; visibleText?: string; speaking?: boolean; reducedMotion?: boolean; sequential?: boolean }) {
  const EmotionIcon = emotionIcons[member.emotion];
  const transcriptId = useId();
  const fullText = text ?? member.thoughtLine ?? member.reactionLine ?? "";
  const shown = visibleText ?? fullText;
  const animationName = reducedMotion || (sequential && !speaking) ? "idle" : speaking ? "agree" : member.animationName;
  return <button type="button" className={styles.voice} data-status={member.status} data-speaking={speaking || undefined} data-character-id={member.characterId} onClick={onInspect} aria-describedby={transcriptId} aria-label={`Inspect ${characterName}'s current status and animation`}>
    {member.status === "ghost"
      ? <span className={`${styles.portrait} ${styles.ghostPortrait}`} role="img" aria-label={`${characterName} is dead`}><Skull aria-hidden="true" /></span>
      : <CharacterPortrait name={characterName} tint={member.tint} className={styles.portrait} characterId={member.characterId} modelUrl={member.modelUrl} animationName={animationName} animationEventId={`${member.animationEventId}:${speaking ? "speaking" : "rest"}`} />}
    <div className={styles.voiceCopy}>
      <div className={styles.voiceHeading}><strong>{characterName}</strong><span>{member.status === "ghost" ? "GHOST" : member.playerName}</span><span className={styles.emotion} data-emotion={member.emotion} role="img" aria-label={`Emotion: ${member.emotion}`} title={member.emotion}><EmotionIcon aria-hidden="true" /></span></div>
      <span className={styles.speakingLabel} aria-hidden="true">{speaking ? "SPEAKING" : sequential && shown.length === 0 ? "LISTENING" : ""}</span>
      <p><span className={styles.transcript} id={transcriptId}>{fullText}</span><span aria-hidden="true">“<span data-visible-dialogue>{shown}</span>{speaking && !reducedMotion && <span className={styles.typingCursor}>▌</span>}<span className={styles.unrevealed}>{fullText.slice(shown.length)}{shown !== fullText ? "”" : ""}</span>{shown === fullText ? "”" : ""}</span></p>
    </div>
  </button>;
}

export function StoryIncidentRoom({ snapshot, phaseContent, contextContent, incidentOverride, animatedPortraits = false, serverClockOffsetMs = 0 }: { snapshot: PublicGameSnapshot; phaseContent: ReactNode; contextContent?: ReactNode; incidentOverride?: IncidentPresentation; animatedPortraits?: boolean; serverClockOffsetMs?: number | null }) {
  const [mobilePanel, setMobilePanel] = useState<"manifest" | "radio" | null>(null);
  const [radioExpanded, setRadioExpanded] = useState(false);
  const [showEventHistory, setShowEventHistory] = useState(false);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string>();
  const radioTranscriptId = useId();
  // The decision and its report share one cinematic scene. Only the panel content
  // changes at resolution; retaining the decision image avoids a jarring scene swap.
  const incident = incidentOverride ?? getIncidentPresentation(snapshot, { keepDecisionScene: snapshot.phase === "reveal" });
  const scene = toSessionScenePresentation(snapshot);
  const names = new Map(snapshot.characterCatalog.map(({ id, displayName }) => [id, displayName]));
  const activeExchange = snapshot.phase === "decision" ? snapshot.activeCrewDialogue : undefined;
  const latestResultExchange = snapshot.eventHistory.at(-1)?.crewDialogue;
  const currentExchange = activeExchange ?? ((snapshot.phase === "reveal" || snapshot.phase === "ending") ? latestResultExchange : undefined);
  const playback = useDialoguePlayback(currentExchange);
  useEffect(() => setRadioExpanded(false), [snapshot.phase, currentExchange?.id]);
  const exchangeLines = currentExchange?.lines;
  const exchangeSpeakerIds = exchangeLines?.map(({ characterId }) => characterId);
  const voices = scene.members.filter(({ characterId, thoughtLine, reactionLine }) => exchangeSpeakerIds
    ? exchangeSpeakerIds.includes(characterId)
    : Boolean(thoughtLine || reactionLine));
  const featuredIds = exchangeSpeakerIds?.length === 2 ? [exchangeSpeakerIds[0]!, exchangeSpeakerIds[1]!] as [string, string] : scene.interactionPairCharacterIds;
  const featured = exchangeLines
    ? exchangeLines.flatMap((line, lineIndex) => {
      const member = voices.find(({ characterId, status }) => characterId === line.characterId && status === "alive");
      return member ? [{ member, lineText: line.text, lineIndex }] : [];
    })
    : (featuredIds
      ? [...featuredIds.flatMap((id) => voices.find((member) => member.characterId === id) ?? []), ...voices.filter(({ characterId }) => !featuredIds.includes(characterId))]
      : voices).map((member) => ({ member, lineText: member.thoughtLine ?? member.reactionLine, lineIndex: -1 }));
  const phaseLabel = snapshot.phase;

  return <div className={styles.layout} data-phase={phaseLabel}>
    <aside className={`${styles.sidebar} ${mobilePanel ? styles.sidebarOpen : ""}`} data-radio-expanded={radioExpanded} aria-label="Crew manifest and radio">
      <section className={styles.manifest} aria-labelledby="manifest-title">
        <header className={styles.sectionHeader}><h2 id="manifest-title">Passenger manifest</h2><span>{snapshot.players.filter(({ connected }) => connected).length}/{MAX_PLAYER_COUNT} LINKED</span></header>
        <div className={styles.rosterScroll}><LobbyRoster players={snapshot.players} characterCatalog={snapshot.characterCatalog} characterStates={snapshot.characters} portraitMembers={scene.members} animatedPortraits={animatedPortraits} compact onInspect={setInspectedPlayerId} /></div>
      </section>
      <section className={styles.radioPanel} aria-labelledby="crew-radio-title">
        <header className={styles.sectionHeader}><h2 id="crew-radio-title">{showEventHistory ? "Black-box history" : "Crew radio"}</h2><div className={styles.radioHeaderActions}><button type="button" className={styles.historyToggle} aria-pressed={showEventHistory} onClick={() => setShowEventHistory((visible) => !visible)}>{showEventHistory ? "Radio" : `History · ${snapshot.eventHistory.length}`}</button><span>{scene.livingCount} ALIVE · {scene.ghostCount} GHOST</span></div></header>
        <div id={radioTranscriptId} className={styles.radioHistory} aria-live="polite" aria-relevant="additions text">
          {showEventHistory
            ? <CrewHistoryPanel events={snapshot.eventHistory} characterNames={Object.fromEntries(snapshot.characterCatalog.map(({ id, displayName }) => [id, displayName]))} />
            : (() => {
            const history = snapshot.eventHistory.flatMap((event) => event.crewDialogue ? [{ id: event.crewDialogue.id, lines: event.crewDialogue.lines }] : []);
            const visibleHistory = history.filter(({ id }) => id !== currentExchange?.id);
            const displayedHistory = radioExpanded ? visibleHistory : visibleHistory.slice(-1);
            const conversationCount = visibleHistory.length + (currentExchange ? 1 : 0);
            return <>
              {visibleHistory.length > 1 && <button type="button" className={styles.radioExpandToggle} aria-controls={radioTranscriptId} aria-expanded={radioExpanded} onClick={() => setRadioExpanded((expanded) => !expanded)}>{radioExpanded ? "Show latest only" : `Show full radio conversation · ${conversationCount} exchanges`}</button>}
              {displayedHistory.map((exchange) => <article className={styles.pastExchange} key={exchange.id} aria-label="Earlier crew exchange">
                {exchange.lines.map((line, index) => <p key={`${exchange.id}:${line.characterId}:${index}`}><strong>{names.get(line.characterId) ?? "Crew"}</strong><span>{line.text}</span></p>)}
              </article>)}
              {featured.length > 0 ? <article className={styles.currentExchange} key={currentExchange?.id ?? "current-radio"} aria-label="Current crew exchange">
                {currentExchange && !playback.complete && <button type="button" className={styles.skipDialogue} onClick={playback.skip}>Skip text reveal</button>}
                {featured.map(({ member, lineText, lineIndex }) => <CrewVoice key={`${currentExchange?.id ?? "current"}:${member.characterId}`} member={member} text={lineText} visibleText={currentExchange && lineIndex >= 0 ? playback.visibleText[lineIndex] : undefined} speaking={Boolean(currentExchange && lineIndex >= 0 && playback.activeIndex === lineIndex)} reducedMotion={playback.reducedMotion} sequential={Boolean(currentExchange)} characterName={names.get(member.characterId) ?? member.name} onInspect={() => setInspectedPlayerId(member.playerId)} />)}
              </article> : null}
              {featured.length === 0 && visibleHistory.length === 0 ? <p className={styles.quiet}>The radio is quiet. The crew is waiting for the next move.</p> : null}
            </>;
          })()}
        </div>
      </section>
      <div className={styles.mobileClose}><button type="button" onClick={() => setMobilePanel(null)}>Close crew panel</button></div>
    </aside>

    <section className={styles.stage} aria-label="Current story scene">
      <div className={styles.sceneCard}>
        <img className={styles.sceneImage} src={incident.image} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
        <div className={styles.sceneShade} />
        <div className={styles.sceneCopy} aria-live="polite">
          <p className={styles.location}>{incident.location} <span>·</span> {scene.phaseLabel}</p>
          <h1>{incident.title}</h1>
          <p className={styles.description}>{incident.description}</p>
        </div>
        <span className={styles.sceneStamp}>FLIGHT 404 · FIELD RECORD</span>
      </div>

      <section className={styles.phasePanel} aria-label="Current game phase" key={snapshot.phase}>
        {phaseContent}
      </section>
      {contextContent && <details className={styles.contextPanel}>
        <summary>Field notes · known conditions</summary>
        <div>{contextContent}</div>
      </details>}
    </section>

    <nav className={styles.mobileDock} aria-label="Crew panels">
      <button type="button" aria-expanded={mobilePanel === "manifest"} onClick={() => setMobilePanel(mobilePanel === "manifest" ? null : "manifest")}>Crew · {snapshot.players.filter(({ connected }) => connected).length}</button>
      <button type="button" aria-expanded={mobilePanel === "radio"} onClick={() => setMobilePanel(mobilePanel === "radio" ? null : "radio")}>Radio · {voices.length}</button>
    </nav>
    {inspectedPlayerId && (() => {
      const player = snapshot.players.find(({ id }) => id === inspectedPlayerId);
      const member = scene.members.find(({ playerId }) => playerId === inspectedPlayerId);
      const definition = member && snapshot.characterCatalog.find(({ id }) => id === member.characterId);
      if (!player || !member || !definition) return null;
      return <CharacterInspectorModal player={player} member={member} character={snapshot.characters.find(({ characterId }) => characterId === member.characterId)} definition={definition} serverClockOffsetMs={serverClockOffsetMs} onClose={() => setInspectedPlayerId(undefined)} />;
    })()}
    <CharacterPortraitCanvasLayer aboveDrawer={Boolean(mobilePanel)} />
  </div>;
}
