import { useState, type ReactNode } from "react";
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
import styles from "./StoryIncidentRoom.module.css";

const emotionIcons = { neutral: RobotFace, happy: Smile, sad: Frown, afraid: WarningDiamond, angry: Angry, relieved: RobotFaceHappy };

function CrewVoice({ member, characterName, onInspect }: { member: ReturnType<typeof toSessionScenePresentation>["members"][number]; characterName: string; onInspect: () => void }) {
  const EmotionIcon = emotionIcons[member.emotion];
  return <button type="button" className={styles.voice} data-status={member.status} onClick={onInspect} aria-label={`Inspect ${characterName}'s current status and animation`}>
    {member.status === "ghost"
      ? <span className={`${styles.portrait} ${styles.ghostPortrait}`} role="img" aria-label={`${characterName} is dead`}><Skull aria-hidden="true" /></span>
      : <CharacterPortrait name={characterName} tint={member.tint} className={styles.portrait} characterId={member.characterId} modelUrl={member.modelUrl} animationName={member.animationName} animationEventId={member.animationEventId} />}
    <div className={styles.voiceCopy}>
      <div className={styles.voiceHeading}><strong>{characterName}</strong><span>{member.status === "ghost" ? "GHOST" : member.playerName}</span><span className={styles.emotion} data-emotion={member.emotion} role="img" aria-label={`Emotion: ${member.emotion}`} title={member.emotion}><EmotionIcon aria-hidden="true" /></span></div>
      <p>“{member.thoughtLine ?? member.reactionLine}”</p>
    </div>
  </button>;
}

export function StoryIncidentRoom({ snapshot, phaseContent, contextContent, incidentOverride, animatedPortraits = false, serverClockOffsetMs = 0 }: { snapshot: PublicGameSnapshot; phaseContent: ReactNode; contextContent?: ReactNode; incidentOverride?: IncidentPresentation; animatedPortraits?: boolean; serverClockOffsetMs?: number | null }) {
  const [mobilePanel, setMobilePanel] = useState<"manifest" | "radio" | null>(null);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string>();
  // The decision and its report share one cinematic scene. Only the panel content
  // changes at resolution; retaining the decision image avoids a jarring scene swap.
  const incident = incidentOverride ?? getIncidentPresentation(snapshot, { keepDecisionScene: snapshot.phase === "reveal" });
  const scene = toSessionScenePresentation(snapshot);
  const names = new Map(snapshot.characterCatalog.map(({ id, displayName }) => [id, displayName]));
  const activeExchange = snapshot.phase === "decision" ? snapshot.activeCrewDialogue : undefined;
  const latestResultExchange = snapshot.eventHistory.at(-1)?.crewDialogue;
  const exchangeLines = (activeExchange ?? latestResultExchange)?.lines;
  const exchangeSpeakerIds = exchangeLines?.map(({ characterId }) => characterId);
  const voices = scene.members.filter(({ characterId, thoughtLine, reactionLine }) => exchangeSpeakerIds
    ? exchangeSpeakerIds.includes(characterId) && Boolean(thoughtLine)
    : Boolean(thoughtLine || reactionLine));
  const featuredIds = exchangeSpeakerIds?.length === 2 ? [exchangeSpeakerIds[0]!, exchangeSpeakerIds[1]!] as [string, string] : scene.interactionPairCharacterIds;
  const featured = featuredIds
    ? [...featuredIds.flatMap((id) => voices.find((member) => member.characterId === id) ?? []), ...voices.filter(({ characterId }) => !featuredIds.includes(characterId))]
    : voices;
  const phaseLabel = snapshot.phase;

  return <div className={styles.layout} data-phase={phaseLabel}>
    <aside className={`${styles.sidebar} ${mobilePanel ? styles.sidebarOpen : ""}`} aria-label="Crew manifest and radio">
      <section className={styles.manifest} aria-labelledby="manifest-title">
        <header className={styles.sectionHeader}><h2 id="manifest-title">Passenger manifest</h2><span>{snapshot.players.filter(({ connected }) => connected).length}/{MAX_PLAYER_COUNT} LINKED</span></header>
        <div className={styles.rosterScroll}><LobbyRoster players={snapshot.players} characterCatalog={snapshot.characterCatalog} characterStates={snapshot.characters} portraitMembers={scene.members} animatedPortraits={animatedPortraits} compact onInspect={setInspectedPlayerId} /></div>
      </section>
      <section className={styles.radioPanel} aria-labelledby="crew-radio-title">
        <header className={styles.sectionHeader}><h2 id="crew-radio-title">Crew radio</h2><span>{scene.livingCount} ALIVE · {scene.ghostCount} GHOST</span></header>
        <div className={styles.radioHistory} aria-live="polite" aria-relevant="additions text">
          {(() => {
            const history = snapshot.eventHistory.flatMap((event) => event.crewDialogue ? [{ id: event.crewDialogue.id, eventId: event.id, lines: event.crewDialogue.lines }] : []).slice(-5);
            const visibleHistory = history.filter(({ eventId }) => activeExchange || eventId !== snapshot.eventHistory.at(-1)?.id);
            return <>
              {visibleHistory.map((exchange) => <article className={styles.pastExchange} key={exchange.id} aria-label="Earlier crew exchange">
                {exchange.lines.map((line, index) => <p key={`${exchange.id}:${line.characterId}:${index}`}><strong>{names.get(line.characterId) ?? "Crew"}</strong><span>{line.text}</span></p>)}
              </article>)}
              {featured.length > 0 ? <article className={styles.currentExchange} key={activeExchange?.id ?? latestResultExchange?.id ?? "current-radio"} aria-label="Current crew exchange">
                {featured.map((member) => <CrewVoice key={`${activeExchange?.id ?? latestResultExchange?.id ?? "current"}:${member.characterId}`} member={member} characterName={names.get(member.characterId) ?? member.name} onInspect={() => setInspectedPlayerId(member.playerId)} />)}
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
    <CharacterPortraitCanvasLayer />
  </div>;
}
