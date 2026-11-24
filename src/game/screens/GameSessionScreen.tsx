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
import { CharacterPortrait } from "../../ui/atoms/CharacterPortrait";
import { CharacterPortraitCanvasLayer } from "../../ui/atoms/CharacterModelPortrait";
import { GameMenu } from "../../ui/organisms/GameMenu";
import { navigateTo } from "../../app/navigation";
import { CHARACTER_CATALOG, MAX_PLAYER_COUNT } from "../../shared/domain";
import { CHARACTER_PROFILES } from "../../shared/content/characterProfiles";
import { CrashChoiceScreen } from "./CrashChoiceScreen";
import { StoryIncidentRoom } from "./StoryIncidentRoom";
import { SessionDebrief } from "./SessionDebrief";
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

function GameCreditsSequence({ decorative = false }: { decorative?: boolean }) {
  return <section className={styles.creditsCrawl} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : "Game credits"}>
    <p className={styles.creditsKicker}>FLIGHT 404 · BLACK BOX 01</p>
    <h1>Island of Extremely Questionable Judgment</h1>
    <p>A flight goes down. Sixteen survivors wake on an island that does not care about their plans.</p>
    <p>Every vote changes the odds. Every bad idea gets written into the black box. Somehow, the crew keeps going.</p>
    <h2>The castaways</h2>
    <ul className={styles.creditsCast}>{CHARACTER_CATALOG.map(({ id, displayName }) => <li key={id}>{displayName}</li>)}</ul>
    <h2>Created by</h2>
    <p className={styles.creditsCreator}>Tony Romo</p>
    <h2>End of transmission</h2>
    <p>Keep the radio dry. Keep your friends close. Maybe leave the bear alone.</p>
    <p className={styles.creditsKicker}>FLIGHT 404 · SIGNAL LOST</p>
  </section>;
}

export function GameCreditsScreen() {
  return <main className={styles.creditsScreen}>
    <ActionButton className={styles.creditsBack} onClick={() => navigateTo("/")}>Back to menu</ActionButton>
    <div className={styles.creditsTrack}><GameCreditsSequence /><GameCreditsSequence decorative /></div>
    <div className={styles.creditsHorizonFade} aria-hidden="true" />
  </main>;
}

export function GameSessionScreen() {
  const [credentials, setCredentials] = useState<ConnectionCredentials | null>(() => loadPendingAdmission() ?? loadSessionCredentials());
  const [menuSettingsOpen, setMenuSettingsOpen] = useState(false);
  const menuSettingsPanelRef = useRef<HTMLElement>(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const pausePanelRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const restorePauseFocus = useRef(false);
  const restoreMenuSettingsFocus = useRef(false);
  const connection = useGameConnection(credentials);
  const snapshot = useGameStore((state) => state.snapshot);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const protocolWarning = useGameStore((state) => state.protocolWarning);
  const serverClockOffsetMs = useGameStore((state) => state.serverClockOffsetMs);
  const rejection = useGameStore((state) => state.lastCommandRejection);
  const [selectedVote, setSelectedVote] = useState<string>();
  const [selectedVoteAssignment, setSelectedVoteAssignment] = useState<string>();
  const [votePending, setVotePending] = useState(false);
  const [lobbyDraftCharacterId, setLobbyDraftCharacterId] = useState<string>();
  const previousRejection = useRef(rejection);
  const previousAudioState = useRef<{ phase?: string; decisionId?: string; revealedEventId?: string }>({});
  const viewer = useMemo(() => snapshot?.players.find(({ id }) => id === snapshot.viewer.playerId), [snapshot]);
  useEffect(() => {
    if (lobbyDraftCharacterId && viewer?.characterId === lobbyDraftCharacterId) setLobbyDraftCharacterId(undefined);
  }, [lobbyDraftCharacterId, viewer?.characterId]);
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
        requestAnimationFrame(() => menuButtonRef.current?.focus());
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

  useEffect(() => {
    if (!menuSettingsOpen) {
      if (restoreMenuSettingsFocus.current) {
        restoreMenuSettingsFocus.current = false;
        requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-menu-item="settings"]')?.focus());
      }
      return;
    }
    restoreMenuSettingsFocus.current = true;
    menuSettingsPanelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuSettingsOpen(false); return; }
      if (event.key !== "Tab" || !menuSettingsPanelRef.current) return;
      const focusable = [...menuSettingsPanelRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === menuSettingsPanelRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuSettingsOpen]);

  if (credentials && !snapshot) return <main className={styles.page}><section className={styles.connectionScreen} aria-live="polite">
    <p className={styles.eyebrow}>FLIGHT 404 · TUNING THE RADIO</p><h1>Connecting to your crew…</h1>
    <ConnectionBanner state={connectionStatus === "connected" ? "connected" : connectionStatus === "expired" ? "expired" : connectionStatus === "failed" ? "failed" : "reconnecting"} onRetry={connection.retry} />
    {protocolWarning && <><p role="alert">{protocolWarning} The lobby snapshot could not be read.</p><ActionButton type="button" onClick={connection.retry}>Retry connection</ActionButton></>}
  </section></main>;

  if (!credentials) return <main className={`${styles.page} ${styles.titleScreen}`}>
    <section className={styles.titleContent} aria-labelledby="game-title"><p className={styles.eyebrow}>FLIGHT 404 · BLACK BOX 01</p><h1 id="game-title">Island of Extremely Questionable Judgment</h1>
      <GameMenu items={[
        { id: "start", label: "Start game", onSelect: () => navigateTo("/start-crew") },
        { id: "join", label: "Join game", onSelect: () => navigateTo("/join-crew") },
        { id: "settings", label: "Settings", onSelect: () => setMenuSettingsOpen(true) },
        { id: "credits", label: "Credits", onSelect: () => navigateTo("/credits") },
        ...(import.meta.env.DEV ? [{ id: "dev-tools", label: "Dev Tools", onSelect: () => navigateTo("/dev-tools") }] : []),
      ]} />
      <p className={styles.titleBlurb}>A damaged safety card, an unreliable crew, and the controls needed to make one more terrible group decision.</p>
      {menuSettingsOpen && <div className={styles.titleSettingsOverlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuSettingsOpen(false); }}>
        <section ref={menuSettingsPanelRef} tabIndex={-1} className={styles.pausePanel} role="dialog" aria-modal="true" aria-label="Main menu audio settings">
          <SettingsDrawer />
          <ActionButton onClick={() => setMenuSettingsOpen(false)}>Back to main menu</ActionButton>
        </section>
      </div>}
    </section>
  </main>;

  if (!snapshot) return null;

  const sendCommand = connection.sendCommand;
  const selectedCharacter = viewer?.characterId;
  const claimed = snapshot.players.flatMap(({ id, characterId }) => id !== snapshot.viewer.playerId && characterId ? [characterId] : []);
  const connectedPlayers = snapshot.players.filter(({ connected }) => connected);
  const lobbyCharacterId = lobbyDraftCharacterId && !claimed.includes(lobbyDraftCharacterId) ? lobbyDraftCharacterId : selectedCharacter ?? undefined;
  const lobbyCharacter = CHARACTER_CATALOG.find(({ id }) => id === lobbyCharacterId);
  const lobbyCharacterProfile = lobbyCharacter ? CHARACTER_PROFILES.find(({ characterId }) => characterId === lobbyCharacter.id) : undefined;
  const lobbyCharacterIndex = lobbyCharacter ? CHARACTER_CATALOG.findIndex(({ id }) => id === lobbyCharacter.id) + 1 : 0;
  const readyCount = connectedPlayers.filter(({ ready }) => ready).length;
  const lobbyStatus = connectionStatus !== "connected" ? "Re-establishing signal" : connectedPlayers.length >= 2 && readyCount === connectedPlayers.length ? "Ready for departure" : "Awaiting departure";
  const isHost = snapshot.hostPlayerId === snapshot.viewer.playerId;
  const errorMessage = rejection?.message;
  const characterNames = Object.fromEntries(snapshot.characterCatalog.map(({ id, displayName: name }) => [id, name]));
  const viewerCharacterState = snapshot.characters.find(({ characterId }) => characterId === viewer?.characterId);
  const scenePresentation = toSessionScenePresentation(snapshot);
  const displayedExchange = snapshot.eventHistory.at(-1)?.crewDialogue;
  const incidentCrewDialogue = displayedExchange
    ? displayedExchange.lines.flatMap(({ characterId }) => {
      const member = scenePresentation.members.find((candidate) => candidate.characterId === characterId);
      return member?.status === "alive" ? [{ characterId, name: member.name.replace(" · GHOST", ""), tint: member.tint, status: member.status, line: member.thoughtLine ?? member.reactionLine, animationName: member.animationName, animationOnce: member.animationOnce, animationHoldAtEnd: member.animationHoldAtEnd, animationEventId: member.animationEventId }] : [];
    })
    : [...scenePresentation.members].sort((a, b) => {
      const pair = scenePresentation.interactionPairCharacterIds;
      if (!pair) return 0;
      return Number(pair.includes(b.characterId)) - Number(pair.includes(a.characterId));
    }).filter(({ status, thoughtLine, reactionLine }) => status === "alive" && Boolean(thoughtLine || reactionLine)).slice(0, 2).map(({ characterId, name, tint, status, thoughtLine, reactionLine, animationName, animationOnce, animationHoldAtEnd, animationEventId }) => ({ characterId, name: name.replace(" · GHOST", ""), tint, status, line: thoughtLine ?? reactionLine, animationName, animationOnce, animationHoldAtEnd, animationEventId }));
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

  if (snapshot.phase === "lobby") return <main className={`${styles.page} ${styles.lobbyPage}`}>
    <header className={styles.topbar}>
      <div><p className={styles.eyebrow}>FLIGHT 404 / BLACK BOX 01</p><h1>Island of Extremely Questionable Judgment</h1></div>
      <div className={styles.roomInfo}><SessionCode code={snapshot.code} /><ConnectionBanner state={connectionState} onRetry={connection.retry} /></div>
    </header>
    <div className={styles.lobby}>
      <PanelFrame title="Passenger manifest" index="01" className={styles.manifestPanel}>
        <div className={styles.manifestCount}><strong>{String(connectedPlayers.length).padStart(2, "0")} / {MAX_PLAYER_COUNT} CONNECTED</strong><span>{readyCount} READY</span></div>
        <LobbyRoster players={snapshot.players} compact />
        {Array.from({ length: Math.min(5, Math.max(0, MAX_PLAYER_COUNT - snapshot.players.length)) }, (_, index) => <div className={styles.waitingSeat} key={`open-seat-${index}`} aria-hidden="true"><span>···</span>AWAITING PASSENGER</div>)}
        {MAX_PLAYER_COUNT - snapshot.players.length > 5 && <p className={styles.waitingMore}>+ {MAX_PLAYER_COUNT - snapshot.players.length - 5} passenger spaces open</p>}
        <p className={styles.manifestFooter}>{connectedPlayers.length < MAX_PLAYER_COUNT ? "WAITING FOR SURVIVORS" : "MANIFEST FULL"}</p>
      </PanelFrame>
      <PanelFrame title="Select your survivor" index="02" className={styles.claimsPanel}>
        <CharacterSelector layout="lobby" selectedId={lobbyCharacterId} claimedIds={claimed} onSelect={(characterId) => setLobbyDraftCharacterId(characterId)} />
      </PanelFrame>
      <PanelFrame title="Passenger file" index="03" className={styles.passengerFilePanel}>
        {lobbyCharacter ? <div className={styles.passengerFile}>
          <div className={styles.passengerModelWindow}>
            <span className={styles.passengerFeedLabel}>LIVE FEED / PASSENGER RECORD</span>
            <CharacterPortrait name={lobbyCharacter.displayName} tint={lobbyCharacter.tint} state="selected" className={styles.passengerPortrait} characterId={lobbyCharacter.id} modelUrl={lobbyCharacter.modelUrl} animationName="idle" animationEventId={`lobby-file:${lobbyCharacter.id}`} framing="full" />
            <span className={styles.passengerId}>PASSENGER ID · {String(lobbyCharacterIndex).padStart(3, "0")}</span>
          </div>
          <div className={styles.passengerIdentity}><h2>{lobbyCharacter.displayName}</h2><p>FLIGHT 404 · SURVIVOR</p></div>
          {lobbyCharacterProfile && <div className={styles.passengerTraits}>
            <div><span>GOOD AT</span><strong>{lobbyCharacterProfile.strengths.join(" · ")}</strong></div>
            <div><span>WATCH FOR</span><strong>{lobbyCharacterProfile.flaws.join(" · ")}</strong></div>
          </div>}
          <ActionButton tone="primary" disabled={!lobbyDraftCharacterId || lobbyDraftCharacterId === selectedCharacter || claimed.includes(lobbyDraftCharacterId) || connectionStatus !== "connected"} onClick={() => lobbyDraftCharacterId && sendCommand({ type: "character.select", payload: { characterId: lobbyDraftCharacterId } })}>
            {lobbyDraftCharacterId === selectedCharacter ? "Selection confirmed" : lobbyDraftCharacterId ? "Confirm selection" : "Selected survivor"}
          </ActionButton>
        </div> : <div className={styles.emptyPassengerFile}>
          <span aria-hidden="true">—</span><strong>No passenger assigned</strong><p>Select an available survivor to inspect their file.</p>
        </div>}
      </PanelFrame>
    </div>
    <footer className={styles.lobbyFooter}>
      <div className={styles.lobbyStatus}><span>Session status · {connectedPlayers.length}/{MAX_PLAYER_COUNT} linked</span><strong data-ready={lobbyStatus === "Ready for departure"}>{lobbyStatus}</strong></div>
      <div className={styles.footerActions}>
        <ActionButton type="button" onClick={leaveSession}>Leave</ActionButton>
        <ActionButton tone="primary" disabled={!selectedCharacter || connectionStatus !== "connected"} onClick={() => sendCommand({ type: "room.set-ready", payload: { ready: !viewer?.ready } })}>{viewer?.ready ? "Not ready" : "Ready up"}</ActionButton>
        {isHost && <ActionButton tone="danger" disabled={connectedPlayers.length < 2 || connectedPlayers.some(({ ready, characterId }) => !ready || !characterId)} onClick={() => sendCommand({ type: "room.start", payload: {} })}>Start the crash</ActionButton>}
      </div>
    </footer>
    <p className={styles.lobbyFootnote}>Session decisions are shared. Character fates are not guaranteed.</p>
    {errorMessage && <p className={styles.notice} role="status">{errorMessage}</p>}
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
            : snapshot.phase === "ending" ? <div className={styles.endingContent}>{snapshot.eventHistory.at(-1) && <ConsequencePanel event={snapshot.eventHistory.at(-1)!} characterNames={characterNames} crewDialogue={incidentCrewDialogue} />}<EndingSummary curtain={false} layout="cinematic" endingId={snapshot.endingId!} survivors={snapshot.players.filter(({ status }) => status === "alive").length} ghosts={snapshot.players.filter(({ status }) => status === "ghost").length} escapeResult={snapshot.escapeResult} characterNames={characterNames} onReturn={leaveSession} onViewHistory={() => setDebriefOpen(true)} /></div>
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
        <div className={styles.sessionControls}><ConnectionBanner state={connectionState} className={styles.compactConnection} onRetry={connection.retry} /><button ref={menuButtonRef} type="button" className={styles.menuButton} onClick={() => setPauseOpen(true)} aria-label="Open menu and volume settings"><span className={styles.menuGlyph} aria-hidden="true" /><span>Menu</span></button></div>
      </header>
      {connectionStatus !== "connected" && <ConnectionBanner state={connectionState} className={styles.connectionOverlay} onRetry={connection.retry} />}
      {!debriefOpen && <StoryIncidentRoom snapshot={snapshot} phaseContent={<div className={styles.phaseContent} data-phase={snapshot.phase}>{phaseContent}</div>} contextContent={showMotorboatStatus && snapshot.motorboat ? <MotorboatStatusPanel status={snapshot.motorboat} launchMode={snapshot.currentDecision?.id === "motorboat-group-launch" ? "group" : undefined} /> : undefined} animatedPortraits serverClockOffsetMs={serverClockOffsetMs} />}
      {debriefOpen && snapshot.phase === "ending" && <SessionDebrief snapshot={snapshot} startedAt={snapshot.startedAt ?? snapshot.createdAt ?? snapshot.eventHistory[0]?.createdAt ?? Date.now()} endingId={snapshot.endingId} onClose={() => setDebriefOpen(false)} />}
      {pauseOpen && <section ref={pausePanelRef} tabIndex={-1} className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-label="Black-box pause menu"><div className={styles.pausePanel}><SettingsDrawer /><div className={styles.pauseActions}><ActionButton tone="primary" onClick={() => setPauseOpen(false)}>Return to game</ActionButton><ActionButton tone="danger" onClick={leaveSession}>Leave session</ActionButton></div></div></section>}
      {errorMessage && <p className={styles.notice} role="status">{errorMessage}</p>}
    </section>
  </main>;
}
