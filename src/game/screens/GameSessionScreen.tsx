import { useEffect, useMemo, useRef, useState } from "react";
import { useGameConnection, type ConnectionCredentials } from "../../client/useGameConnection";
import { useGameStore } from "../../client/useGameStore";
import { loadPendingAdmission, loadSessionCredentials } from "../../client/sessionStorage";
import { CharacterSelector } from "../../ui/organisms/CharacterSelector";
import { LobbyRoster } from "../../ui/organisms/LobbyRoster";
import { ConnectionBanner } from "../../ui/molecules/ConnectionBanner";
import { SessionCode } from "../../ui/molecules/SessionCode";
import { DecisionConsole } from "../../ui/organisms/DecisionConsole";
import { EndingSummary } from "../../ui/organisms/EndingSummary";
import { ConsequencePanel } from "../../ui/organisms/ConsequencePanel";
import { AssignmentResponsePanel } from "../../ui/organisms/AssignmentResponsePanel";
import { PrivateChoicePanel } from "../../ui/organisms/PrivateChoicePanel";
import { MotorboatStatusPanel } from "../../ui/organisms/MotorboatStatusPanel";
import { PanelFrame } from "../../ui/organisms/PanelFrame";
import { SettingsDrawer } from "../../ui/organisms/SettingsDrawer";
import { ActionButton } from "../../ui/atoms/ActionButton";
import { GameMenu } from "../../ui/organisms/GameMenu";
import { CrashChoiceScreen } from "./CrashChoiceScreen";
import { SessionIslandView } from "./SessionIslandView";
import styles from "./GameSessionScreen.module.css";

export function GameSessionScreen() {
  const [credentials, setCredentials] = useState<ConnectionCredentials | null>(() => loadPendingAdmission() ?? loadSessionCredentials());
  const [frontPage, setFrontPage] = useState<"menu" | "settings" | "credits">("menu");
  const [manifestOpen, setManifestOpen] = useState(false);
  const [motorboatOpen, setMotorboatOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const pausePanelRef = useRef<HTMLElement>(null);
  const connection = useGameConnection(credentials);
  const snapshot = useGameStore((state) => state.snapshot);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const serverClockOffsetMs = useGameStore((state) => state.serverClockOffsetMs);
  const rejection = useGameStore((state) => state.lastCommandRejection);
  const [selectedVote, setSelectedVote] = useState<string>();
  const viewer = useMemo(() => snapshot?.players.find(({ id }) => id === snapshot.viewer.playerId), [snapshot]);
  useEffect(() => setSelectedVote(undefined), [snapshot?.currentDecision?.id]);
  useEffect(() => {
    if (!pauseOpen) return;
    pausePanelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPauseOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pauseOpen]);

  if (credentials && !snapshot) return <main className={styles.page}><section className={styles.connectionScreen} aria-live="polite">
    <p className={styles.eyebrow}>FLIGHT 404 · TUNING THE RADIO</p><h1>Connecting to your crew…</h1>
    <ConnectionBanner state={connectionStatus === "connected" ? "connected" : connectionStatus === "expired" ? "expired" : connectionStatus === "failed" ? "failed" : "reconnecting"} />
  </section></main>;

  if (!credentials && frontPage === "menu") return <main className={`${styles.page} ${styles.titleScreen}`}>
    <section className={styles.titleContent} aria-labelledby="game-title"><p className={styles.eyebrow}>FLIGHT 404 · BLACK BOX 01</p><h1 id="game-title">Island of Extremely Questionable Judgment</h1>
      <GameMenu items={[
        { id: "start", label: "Start game", onSelect: () => window.location.assign("/start-crew") },
        { id: "join", label: "Join game", onSelect: () => window.location.assign("/join-crew") },
        { id: "settings", label: "Settings", onSelect: () => setFrontPage("settings") },
        { id: "credits", label: "Credits", onSelect: () => setFrontPage("credits") },
      ]} />
      <p className={styles.titleBlurb}>A damaged safety card, an unreliable crew, and the controls needed to make one more terrible group decision.</p>
      <a className={styles.devLink} href="/sandbox">Open island sandbox <span>DEV</span></a>
    </section>
  </main>;

  if (!credentials && frontPage === "settings") return <main className={`${styles.page} ${styles.titleScreen}`}><section className={styles.menuPanel}><SettingsDrawer /><ActionButton onClick={() => setFrontPage("menu")}>Back</ActionButton></section></main>;
  if (!credentials && frontPage === "credits") return <main className={`${styles.page} ${styles.titleScreen}`}><section className={styles.menuPanel}><p className={styles.eyebrow}>FLIGHT 404 · CREW CREDITS</p><h1>Made for bad decisions together.</h1><p>The island, the black box, and the crew are all still taking notes.</p><ActionButton onClick={() => setFrontPage("menu")}>Back</ActionButton></section></main>;

  if (!snapshot) return null;

  const sendCommand = connection.sendCommand;
  const selectedCharacter = viewer?.characterId;
  const claimed = snapshot.players.flatMap(({ id, characterId }) => id !== snapshot.viewer.playerId && characterId ? [characterId] : []);
  const connectedPlayers = snapshot.players.filter(({ connected }) => connected);
  const isHost = snapshot.hostPlayerId === snapshot.viewer.playerId;
  const errorMessage = rejection?.message;
  const characterNames = Object.fromEntries(snapshot.characterCatalog.map(({ id, displayName: name }) => [id, name]));
  const viewerCharacterState = snapshot.characters.find(({ characterId }) => characterId === viewer?.characterId);

  const connectionState = connectionStatus === "connected" ? "connected" : connectionStatus === "expired" ? "expired" : connectionStatus === "failed" ? "failed" : "reconnecting";
  const leaveSession = () => {
    connection.leave();
    useGameStore.getState().reset();
    setCredentials(null);
  };

  if (snapshot.phase === "lobby") return <main className={styles.page}>
    <header className={styles.topbar}><div><p className={styles.eyebrow}>FLIGHT 404 · BLACK BOX 01</p><h1>Island of Extremely Questionable Judgment</h1></div><div className={styles.roomInfo}><SessionCode code={snapshot.code} /><ConnectionBanner state={connectionState} /></div></header>
    <div className={styles.lobby}>
      <PanelFrame title={`Passenger manifest · ${connectedPlayers.length}/8 connected`} index="01" className={styles.manifestPanel}><LobbyRoster players={snapshot.players} />
        <div className={styles.lobbyActions}>
          <ActionButton tone="primary" disabled={!selectedCharacter || connectionStatus !== "connected"} onClick={() => sendCommand({ type: "room.set-ready", payload: { ready: !viewer?.ready } })}>{viewer?.ready ? "Not ready" : "Ready up"}</ActionButton>
          {isHost && <ActionButton disabled={connectedPlayers.length < 2 || connectedPlayers.some(({ ready, characterId }) => !ready || !characterId)} onClick={() => sendCommand({ type: "room.start", payload: {} })}>Start the crash</ActionButton>}
        </div>
      </PanelFrame>
      <PanelFrame title="Choose a survivor" index="02" className={styles.claimsPanel}><CharacterSelector selectedId={selectedCharacter ?? undefined} claimedIds={claimed} onSelect={(characterId) => sendCommand({ type: "character.select", payload: { characterId } })} /></PanelFrame>
    </div>
    {errorMessage && <p className={styles.notice} role="status">{errorMessage}</p>}
    <footer className={styles.footer}><span>Session decisions are shared. Character fates are not guaranteed.</span><ActionButton type="button" onClick={leaveSession}>Leave session</ActionButton></footer>
  </main>;

  const phaseContent = snapshot.phase === "crashItemChoice" || snapshot.phase === "crashRescueChoice" || snapshot.phase === "crashResolution"
    ? <CrashChoiceScreen connection={{ sendCommand }} />
    : snapshot.phase === "intro" ? <section className={styles.phaseCard}><p className={styles.eyebrow}>IMPACT · T-MINUS A VERY BAD DAY</p><h2>Everybody is briefly wondering if that was normal.</h2><p>The crew is gathering itself before choosing what to carry and who to pull clear.</p></section>
    : snapshot.phase === "decision" && snapshot.currentDecision && snapshot.phaseDeadlineAt !== null ? <DecisionConsole decision={snapshot.currentDecision} deadline={snapshot.phaseDeadlineAt} votingOpensAt={snapshot.votingOpensAt} serverClockOffsetMs={serverClockOffsetMs} selectedId={selectedVote} submitted={snapshot.viewer.hasVoted} characterNames={characterNames} onVote={(optionId, assignedCharacterId) => {
      setSelectedVote(optionId);
      sendCommand({ type: "vote.submit", payload: { optionId, ...(assignedCharacterId ? { assignedCharacterId } : {}) } });
    }} />
      : snapshot.phase === "assignmentResponse" && snapshot.activeAssignment ? <AssignmentResponsePanel assignment={snapshot.activeAssignment} actorName={characterNames[snapshot.activeAssignment.actorCharacterId] ?? snapshot.activeAssignment.actorCharacterId} viewerAssignment={snapshot.viewerAssignment} serverClockOffsetMs={serverClockOffsetMs} onRespond={(response) => sendCommand({ type: "assignment.respond", payload: { assignmentId: snapshot.activeAssignment!.id, response } })} />
        : snapshot.phase === "privateChoice" && snapshot.activePrivateChoice ? <PrivateChoicePanel choice={snapshot.activePrivateChoice} viewerChoice={snapshot.viewerPrivateChoice} actorName={snapshot.activePrivateChoice.publicActorCharacterId ? characterNames[snapshot.activePrivateChoice.publicActorCharacterId] ?? snapshot.activePrivateChoice.publicActorCharacterId : undefined} characterNames={characterNames} motorboat={snapshot.motorboat} serverClockOffsetMs={serverClockOffsetMs} onRespond={(optionId, targetCharacterId) => sendCommand({ type: "private-choice.respond", payload: { choiceId: snapshot.activePrivateChoice!.id, optionId, ...(targetCharacterId ? { targetCharacterId } : {}) } })} />
          : snapshot.phase === "reveal" ? <section className={styles.reveal}><p className={styles.eyebrow}>GROUP DECISION · {snapshot.decisionNumber}/{snapshot.totalDecisions}</p>{snapshot.eventHistory.at(-1) ? <ConsequencePanel event={snapshot.eventHistory.at(-1)!} characterNames={characterNames} /> : <section className={styles.phaseCard}><h2>The crew has made a decision.</h2></section>}<p className={styles.revealNote}>Even ghosts get a vote. The living get the consequences.</p></section>
            : snapshot.phase === "ending" ? <EndingSummary endingId={snapshot.endingId!} survivors={snapshot.players.filter(({ status }) => status === "alive").length} ghosts={snapshot.players.filter(({ status }) => status === "ghost").length} escapeResult={snapshot.escapeResult} characterNames={characterNames} onReturn={leaveSession} />
              : <section className={styles.phaseCard}><p className={styles.eyebrow}>BLACK BOX</p><h2>Waiting for the next event…</h2></section>;

  return <main className={`${styles.page} ${styles.gameplayPage}`}>
    <section className={styles.sessionViewport} aria-label="Current session">
      <SessionIslandView snapshot={snapshot} immersive />
      <header className={styles.gameplayHud}>
        <p className={styles.gameIdentity}>FLIGHT 404 · BLACK BOX 01</p>
        <div className={styles.resourceStrip} aria-label="Your survival resources">
          {viewerCharacterState && (["food", "health", "morale", "water"] as const).map((resource) => <span key={resource}><b>{resource}</b><strong>{viewerCharacterState.resources[resource]}</strong></span>)}
          <span><b>shelter</b><strong>{snapshot.resources.shelter}</strong></span>
        </div>
        <div className={styles.sessionControls}><SessionCode code={snapshot.code} className={styles.compactCode} /><ConnectionBanner state={connectionState} className={styles.compactConnection} /><button type="button" className={styles.pauseButton} onClick={() => setPauseOpen(true)}>Pause</button></div>
      </header>
      <div className={styles.worldControls}>
        <button type="button" className={styles.overlayButton} aria-expanded={manifestOpen} onClick={() => setManifestOpen((open) => !open)}>Crew · {connectedPlayers.length}/8</button>
        {snapshot.motorboat && <button type="button" className={styles.overlayButton} aria-expanded={motorboatOpen} onClick={() => setMotorboatOpen((open) => !open)}>Motorboat · {snapshot.motorboat.node}</button>}
      </div>
      {manifestOpen && <aside className={styles.manifestOverlay}><PanelFrame title={`Passenger manifest · ${connectedPlayers.length}/8 connected`} index="01"><LobbyRoster players={snapshot.players} /></PanelFrame></aside>}
      {motorboatOpen && snapshot.motorboat && <aside className={styles.routeOverlay}><MotorboatStatusPanel status={snapshot.motorboat} launchMode={snapshot.currentDecision?.id === "motorboat-group-launch" ? "group" : undefined} /></aside>}
      {connectionStatus !== "connected" && <ConnectionBanner state={connectionState} className={styles.connectionOverlay} />}
      {snapshot.phase !== "ending" && <section className={styles.phaseOverlay} data-phase={snapshot.phase}>{phaseContent}</section>}
      {snapshot.phase === "ending" && phaseContent}
      {pauseOpen && <section ref={pausePanelRef} tabIndex={-1} className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-label="Black-box pause menu"><div className={styles.pausePanel}><SettingsDrawer /><div className={styles.pauseActions}><ActionButton tone="primary" onClick={() => setPauseOpen(false)}>Return to game</ActionButton><ActionButton tone="danger" onClick={leaveSession}>Leave session</ActionButton></div></div></section>}
      {errorMessage && <p className={styles.notice} role="status">{errorMessage}</p>}
    </section>
  </main>;
}
