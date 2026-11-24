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
import { CharacterPortraitCanvasLayer } from "../../ui/atoms/CharacterModelPortrait";
import { GameMenu } from "../../ui/organisms/GameMenu";
import { navigateTo } from "../../app/navigation";
import { MAX_PLAYER_COUNT } from "../../shared/domain";
import { CrashChoiceScreen } from "./CrashChoiceScreen";
import { StoryIncidentRoom } from "./StoryIncidentRoom";
import { toSessionScenePresentation } from "../../scene/sessionPresentation";
import { playSound, requestDecisionMusic, requestEndingMusic, requestIslandAmbience, requestMenuMusic, stopAllSounds, unlockAudio } from "../../audio/audioSystem";
import type { DecisionMusicTheme } from "../../audio/decisionMusic";
import type { EndingMusicKind } from "../../audio/endingMusic";
import styles from "./GameSessionScreen.module.css";

function decisionMusicTheme(decisionId: string, prompt: string): DecisionMusicTheme {
  const context = `${decisionId} ${prompt}`.toLowerCase();
  if (/motorboat|launch|escape|engine|fuel|boat/.test(context)) return "escape";
  if (/signal|radio|flare|plane|rescue|help/.test(context)) return "signal";
  return "survival";
}

export function GameSessionScreen() {
  const [credentials, setCredentials] = useState<ConnectionCredentials | null>(() => loadPendingAdmission() ?? loadSessionCredentials());
  const [frontPage, setFrontPage] = useState<"menu" | "settings" | "credits">("menu");
  const [pauseOpen, setPauseOpen] = useState(false);
  const pausePanelRef = useRef<HTMLElement>(null);
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const restorePauseFocus = useRef(false);
  const connection = useGameConnection(credentials);
  const snapshot = useGameStore((state) => state.snapshot);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const serverClockOffsetMs = useGameStore((state) => state.serverClockOffsetMs);
  const rejection = useGameStore((state) => state.lastCommandRejection);
  const [selectedVote, setSelectedVote] = useState<string>();
  const [selectedVoteAssignment, setSelectedVoteAssignment] = useState<string>();
  const [votePending, setVotePending] = useState(false);
  const previousRejection = useRef(rejection);
  const previousAudioState = useRef<{ phase?: string; decisionId?: string; revealedEventId?: string }>({});
  const viewer = useMemo(() => snapshot?.players.find(({ id }) => id === snapshot.viewer.playerId), [snapshot]);
  useEffect(() => {
    const phase = snapshot?.phase;
    const isChoicePhase = phase === "decision" || phase === "crashItemChoice" || phase === "crashRescueChoice" || phase === "assignmentResponse" || phase === "privateChoice";
    const decision = snapshot?.currentDecision;
    const deadline = snapshot?.phaseDeadlineAt;
    if (!isChoicePhase || deadline === null || deadline === undefined) {
      requestDecisionMusic(false);
      return;
    }
    const contextId = decision?.id ?? snapshot?.activeAssignment?.decisionId ?? snapshot?.activePrivateChoice?.kind ?? phase ?? "survival";
    const contextText = decision?.prompt ?? snapshot?.activeAssignment?.roleLabel ?? "";
    const theme = decisionMusicTheme(contextId, contextText);
    const updateIntensity = () => {
      const remainingSeconds = Math.ceil((deadline - (Date.now() + (serverClockOffsetMs ?? 0))) / 1000);
      requestDecisionMusic(true, remainingSeconds <= 5 ? 2 : remainingSeconds <= 10 ? 1 : 0, theme);
    };
    updateIntensity();
    const timer = window.setInterval(updateIntensity, 500);
    return () => {
      window.clearInterval(timer);
      requestDecisionMusic(false);
    };
  }, [snapshot?.phase, snapshot?.currentDecision?.id, snapshot?.currentDecision?.prompt, snapshot?.activeAssignment?.id, snapshot?.activePrivateChoice?.id, snapshot?.phaseDeadlineAt, serverClockOffsetMs]);
  useEffect(() => {
    if (snapshot?.phase !== "ending") {
      requestEndingMusic(false);
      return;
    }
    const hasEscape = (snapshot.escapeResult?.escapedCharacterIds.length ?? 0) > 0;
    const endingKind: EndingMusicKind = hasEscape ? "victory" : "defeat";
    requestEndingMusic(true, endingKind);
    return () => requestEndingMusic(false);
  }, [snapshot?.phase, snapshot?.escapeResult?.escapedCharacterIds.length]);
  useEffect(() => { setSelectedVote(undefined); setSelectedVoteAssignment(undefined); setVotePending(false); }, [snapshot?.currentDecision?.id]);
  useEffect(() => {
    if (rejection !== previousRejection.current) {
      previousRejection.current = rejection;
      setSelectedVote(undefined);
      setSelectedVoteAssignment(undefined);
      setVotePending(false);
    }
  }, [rejection]);
  useEffect(() => {
    if (connectionStatus !== "connected") {
      setSelectedVote(undefined);
      setSelectedVoteAssignment(undefined);
      setVotePending(false);
    }
  }, [connectionStatus]);
  useEffect(() => {
    if (votePending && snapshot?.phase === "decision" && snapshot.viewer.hasVoted) setVotePending(false);
  }, [snapshot?.revision]);
  useEffect(() => {
    if (!snapshot) {
      requestIslandAmbience(false);
      previousAudioState.current = {};
      return;
    }
    const previous = previousAudioState.current;
    const latestEvent = snapshot.eventHistory.at(-1);
    requestIslandAmbience(snapshot.phase !== "lobby" && snapshot.phase !== "ending");
    if (snapshot.phase === "crashItemChoice" && previous.phase === "intro") playSound("crash-impact");
    if (snapshot.phase === "decision" && (previous.phase !== "decision" || previous.decisionId !== snapshot.currentDecision?.id)) playSound("decision-open");
    if (snapshot.phase === "reveal" && latestEvent && previous.revealedEventId !== latestEvent.id) {
      playSound("consequence-reveal");
      playSound("library-report-paper");
      playSound("crew-radio");
      const eventCopy = `${latestEvent.text} ${latestEvent.resolution?.outcomeText ?? ""}`;
      if (/\b(fire|flame|flare|burn\w*|smoke)\b/iu.test(eventCopy)) playSound("character-fire");
      if (latestEvent.resolution?.statusChanges.some(({ after }) => after === "ghost") || (latestEvent.deathCharacterIds?.length ?? 0) > 0) playSound("ghost-arrival");
      const cue = latestEvent.resolution?.presentationCue ?? latestEvent.socialCue;
      if (cue === "success") playSound("outcome-success");
      if (cue === "danger" || cue === "setback") playSound("outcome-setback");
      if (latestEvent.decisionId === "motorboat-group-launch") {
        playSound("motorboat-start");
        playSound("library-metal-latch");
      }
    }
    previousAudioState.current = {
      phase: snapshot.phase,
      decisionId: snapshot.currentDecision?.id,
      revealedEventId: snapshot.phase === "reveal" ? latestEvent?.id : previous.revealedEventId,
    };
  }, [snapshot?.phase, snapshot?.currentDecision?.id, snapshot?.eventHistory.length, snapshot?.eventHistory.at(-1)?.id]);
  useEffect(() => {
    if (!pauseOpen) {
      if (restorePauseFocus.current) {
        restorePauseFocus.current = false;
        requestAnimationFrame(() => pauseButtonRef.current?.focus());
      }
      return;
    }
    restorePauseFocus.current = true;
    pausePanelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPauseOpen(false);
        return;
      }
      if (event.key !== "Tab" || !pausePanelRef.current) return;
      const focusable = [...pausePanelRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === pausePanelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
        { id: "start", label: "Start game", onSelect: () => navigateTo("/start-crew") },
        { id: "join", label: "Join game", onSelect: () => navigateTo("/join-crew") },
        { id: "settings", label: "Settings", onSelect: () => setFrontPage("settings") },
        { id: "credits", label: "Credits", onSelect: () => setFrontPage("credits") },
      ]} />
      <p className={styles.titleBlurb}>A damaged safety card, an unreliable crew, and the controls needed to make one more terrible group decision.</p>
      <a className={styles.devLink} href="/sandbox">Open island sandbox <span>DEV</span></a>
      {import.meta.env.DEV && <a className={styles.devLink} href="/decision-test">Test story decisions <span>DEV</span></a>}
      <a className={styles.devLink} href="/sound-test">Test game audio</a>
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
  const scenePresentation = toSessionScenePresentation(snapshot);
  const displayedExchange = snapshot.eventHistory.at(-1)?.crewDialogue;
  const incidentCrewDialogue = displayedExchange
    ? displayedExchange.lines.flatMap(({ characterId }) => {
      const member = scenePresentation.members.find((candidate) => candidate.characterId === characterId);
      return member ? [{ characterId, name: member.name.replace(" · GHOST", ""), tint: member.tint, status: member.status, line: member.thoughtLine ?? member.reactionLine, animationName: member.animationName, animationOnce: member.animationOnce, animationHoldAtEnd: member.animationHoldAtEnd, animationEventId: member.animationEventId }] : [];
    })
    : [...scenePresentation.members].sort((a, b) => {
      const pair = scenePresentation.interactionPairCharacterIds;
      if (!pair) return 0;
      return Number(pair.includes(b.characterId)) - Number(pair.includes(a.characterId));
    }).filter(({ thoughtLine, reactionLine }) => Boolean(thoughtLine || reactionLine)).slice(0, 2).map(({ characterId, name, tint, status, thoughtLine, reactionLine, animationName, animationOnce, animationHoldAtEnd, animationEventId }) => ({ characterId, name: name.replace(" · GHOST", ""), tint, status, line: thoughtLine ?? reactionLine, animationName, animationOnce, animationHoldAtEnd, animationEventId }));
  const liveVotes = snapshot.liveVotes ?? [];
  const visibleVotes = votePending && selectedVote
    ? [...liveVotes.filter(({ playerId }) => playerId !== snapshot.viewer.playerId), { playerId: snapshot.viewer.playerId, optionId: selectedVote, ...(selectedVoteAssignment ? { assignedCharacterId: selectedVoteAssignment } : {}) }]
    : liveVotes;
  const showMotorboatStatus = Boolean(snapshot.motorboat && (!snapshot.campaign || snapshot.campaign.node === "motorboat" || (snapshot.phase === "ending" && snapshot.endingId !== "signal-rescue")));

  const connectionState = connectionStatus === "connected" ? "connected" : connectionStatus === "expired" ? "expired" : connectionStatus === "failed" ? "failed" : "reconnecting";
  const leaveSession = () => {
    stopAllSounds();
    requestMenuMusic(true);
    connection.leave();
    useGameStore.getState().reset();
    setCredentials(null);
  };

  if (snapshot.phase === "lobby") return <main className={styles.page}>
    <header className={styles.topbar}><div><p className={styles.eyebrow}>FLIGHT 404 · BLACK BOX 01</p><h1>Island of Extremely Questionable Judgment</h1></div><div className={styles.roomInfo}><SessionCode code={snapshot.code} /><ConnectionBanner state={connectionState} /></div></header>
    <div className={styles.lobby}>
      <PanelFrame title={`Passenger manifest · ${connectedPlayers.length}/${MAX_PLAYER_COUNT} connected`} index="01" className={styles.manifestPanel}><LobbyRoster players={snapshot.players} />
        <div className={styles.lobbyActions}>
          <ActionButton tone="primary" disabled={!selectedCharacter || connectionStatus !== "connected"} onClick={() => sendCommand({ type: "room.set-ready", payload: { ready: !viewer?.ready } })}>{viewer?.ready ? "Not ready" : "Ready up"}</ActionButton>
          {isHost && <ActionButton disabled={connectedPlayers.length < 2 || connectedPlayers.some(({ ready, characterId }) => !ready || !characterId)} onClick={() => sendCommand({ type: "room.start", payload: {} })}>Start the crash</ActionButton>}
        </div>
      </PanelFrame>
      <PanelFrame title="Choose a survivor" index="02" className={styles.claimsPanel}><CharacterSelector selectedId={selectedCharacter ?? undefined} claimedIds={claimed} onSelect={(characterId) => sendCommand({ type: "character.select", payload: { characterId } })} /></PanelFrame>
    </div>
    {errorMessage && <p className={styles.notice} role="status">{errorMessage}</p>}
    <footer className={styles.footer}><span>Session decisions are shared. Character fates are not guaranteed.</span><ActionButton type="button" onClick={leaveSession}>Leave session</ActionButton></footer>
    <CharacterPortraitCanvasLayer />
  </main>;

  const phaseContent = snapshot.phase === "crashItemChoice" || snapshot.phase === "crashRescueChoice" || snapshot.phase === "crashResolution"
    ? <CrashChoiceScreen connection={{ sendCommand }} layout="story" />
    : snapshot.phase === "intro" ? <section className={styles.phaseCard}><p className={styles.eyebrow}>IMPACT · T-MINUS A VERY BAD DAY</p><h2>Everybody is briefly wondering if that was normal.</h2><p>The crew is gathering itself before choosing what to carry and who to pull clear.</p></section>
    : snapshot.phase === "decision" && snapshot.currentDecision && snapshot.phaseDeadlineAt !== null ? <DecisionConsole layout="story" decision={snapshot.currentDecision} deadline={snapshot.phaseDeadlineAt} votingOpensAt={snapshot.votingOpensAt} serverClockOffsetMs={serverClockOffsetMs} selectedId={selectedVote ?? liveVotes.find(({ playerId }) => playerId === snapshot.viewer.playerId)?.optionId} submitted={snapshot.viewer.hasVoted && !votePending} submitting={votePending} characterNames={characterNames} characterCatalog={snapshot.characterCatalog} liveVotes={visibleVotes} pendingVoterId={votePending ? snapshot.viewer.playerId : undefined} eligibleVoterIds={snapshot.eligibleVoterIds} players={snapshot.players} onVote={(optionId, assignedCharacterId, targetCharacterId) => {
      if (votePending) return;
      setSelectedVote(optionId);
      setSelectedVoteAssignment(assignedCharacterId);
      setVotePending(true);
      unlockAudio();
      playSound("vote-submit");
      playSound("library-ui-confirm");
      sendCommand({ type: "vote.submit", payload: { optionId, ...(assignedCharacterId ? { assignedCharacterId } : {}), ...(targetCharacterId ? { targetCharacterId } : {}) } });
    }} />
      : snapshot.phase === "assignmentResponse" && snapshot.activeAssignment ? <AssignmentResponsePanel assignment={snapshot.activeAssignment} actorName={characterNames[snapshot.activeAssignment.actorCharacterId] ?? snapshot.activeAssignment.actorCharacterId} viewerAssignment={snapshot.viewerAssignment} serverClockOffsetMs={serverClockOffsetMs} onRespond={(response) => sendCommand({ type: "assignment.respond", payload: { assignmentId: snapshot.activeAssignment!.id, response } })} />
          : snapshot.phase === "privateChoice" && snapshot.activePrivateChoice ? <PrivateChoicePanel layout="story" choice={snapshot.activePrivateChoice} viewerChoice={snapshot.viewerPrivateChoice} actorName={snapshot.activePrivateChoice.publicActorCharacterId ? characterNames[snapshot.activePrivateChoice.publicActorCharacterId] ?? snapshot.activePrivateChoice.publicActorCharacterId : undefined} characterNames={characterNames} players={snapshot.players} characterCatalog={snapshot.characterCatalog} motorboat={snapshot.motorboat} serverClockOffsetMs={serverClockOffsetMs} onRespond={(optionId, targetCharacterId) => sendCommand({ type: "private-choice.respond", payload: { choiceId: snapshot.activePrivateChoice!.id, optionId, ...(targetCharacterId ? { targetCharacterId } : {}) } })} />
    : snapshot.phase === "reveal" ? <section className={styles.reveal}><p className={styles.eyebrow}>STORY DECISION · {snapshot.decisionNumber}</p>{snapshot.eventHistory.at(-1) ? <ConsequencePanel event={snapshot.eventHistory.at(-1)!} characterNames={characterNames} crewDialogue={incidentCrewDialogue} /> : <section className={styles.phaseCard}><h2>The crew has made a decision.</h2></section>}</section>
            : snapshot.phase === "ending" ? <EndingSummary curtain={false} layout="cinematic" endingId={snapshot.endingId!} survivors={snapshot.players.filter(({ status }) => status === "alive").length} ghosts={snapshot.players.filter(({ status }) => status === "ghost").length} escapeResult={snapshot.escapeResult} characterNames={characterNames} onReturn={leaveSession} />
              : <section className={styles.phaseCard}><p className={styles.eyebrow}>BLACK BOX</p><h2>Waiting for the next event…</h2></section>;

  return <main className={`${styles.page} ${styles.gameplayPage}`}>
    <section className={styles.sessionViewport} aria-label="Current session">
      <header className={styles.gameplayHud}>
        <div className={styles.identityCluster}>
          <p className={styles.gameIdentity}><span className={styles.fullIdentity}>FLIGHT 404 · BLACK BOX 01</span><span className={styles.shortIdentity}>FLIGHT 404 · BOX 01</span></p>
          <SessionCode code={snapshot.code} className={styles.compactCode} />
        </div>
        <div className={styles.resourceStrip} aria-label="Your survivor resources and shared crew shelter">
          {viewerCharacterState && (["food", "health", "morale", "water"] as const).map((resource) => <span key={resource} data-scope="character" aria-label={`Your ${resource}: ${viewerCharacterState.resources[resource]}`}><b>{resource}</b><strong>{viewerCharacterState.resources[resource]}</strong></span>)}
          <span data-scope="crew" aria-label={`Crew shelter: ${snapshot.resources.shelter}`}><b>shelter</b><strong>{snapshot.resources.shelter}</strong></span>
        </div>
        <div className={styles.sessionControls}><ConnectionBanner state={connectionState} className={styles.compactConnection} /><button ref={pauseButtonRef} type="button" className={styles.pauseButton} onClick={() => setPauseOpen(true)} aria-label="Pause and settings"><span className={styles.pauseGlyph} aria-hidden="true" /><span>Pause</span></button></div>
      </header>
      {connectionStatus !== "connected" && <ConnectionBanner state={connectionState} className={styles.connectionOverlay} />}
      <StoryIncidentRoom snapshot={snapshot} phaseContent={<div className={styles.phaseContent} data-phase={snapshot.phase}>{phaseContent}</div>} contextContent={showMotorboatStatus && snapshot.motorboat ? <MotorboatStatusPanel status={snapshot.motorboat} launchMode={snapshot.currentDecision?.id === "motorboat-group-launch" ? "group" : undefined} /> : undefined} animatedPortraits serverClockOffsetMs={serverClockOffsetMs} />
      {pauseOpen && <section ref={pausePanelRef} tabIndex={-1} className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-label="Black-box pause menu"><div className={styles.pausePanel}><SettingsDrawer /><div className={styles.pauseActions}><ActionButton tone="primary" onClick={() => setPauseOpen(false)}>Return to game</ActionButton><ActionButton tone="danger" onClick={leaveSession}>Leave session</ActionButton></div></div></section>}
      {errorMessage && <p className={styles.notice} role="status">{errorMessage}</p>}
    </section>
  </main>;
}
