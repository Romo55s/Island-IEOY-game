import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { gsap } from "gsap";
import type { SessionSceneMember } from "../../scene/sessionPresentation";
import { CHARACTER_PROFILES } from "../../shared/content/characterProfiles";
import type { CharacterDefinition, CharacterState, Player } from "../../shared/domain";
import { CharacterModel } from "../../scene/characters/CharacterModel";
import { RetroButton } from "../atoms/RetroButton";
import styles from "./characterInspectorModal.module.css";

const statLabels = ["health", "food", "water", "morale"] as const;
const animationLabel = (name: string) => name.replace(/[_-]+/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());

export function CharacterInspectorModal({
  player,
  member,
  character,
  definition,
  serverClockOffsetMs = 0,
  onClose,
}: {
  player: Player;
  member: SessionSceneMember;
  character?: CharacterState;
  definition: CharacterDefinition;
  serverClockOffsetMs?: number | null;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const ghost = member.status === "ghost";
  const profile = CHARACTER_PROFILES.find(({ characterId }) => characterId === definition.id);
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) return;
    if (reducedMotion) {
      gsap.set([backdrop, panel], { clearProps: "all" });
      panel.focus();
      return;
    }
    const timeline = gsap.timeline({ onComplete: () => panel.focus() });
    timeline.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.16, ease: "steps(2)" })
      .fromTo(panel, { x: 42, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.22, ease: "steps(3)" }, "<");
    return () => { timeline.kill(); };
  }, [reducedMotion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
      if (event.key !== "Tab" || !panelRef.current) return;
      const controls = [...panelRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")];
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel || reducedMotion) { closeRef.current(); return; }
    gsap.timeline({ onComplete: () => closeRef.current() })
      .to(panel, { x: 28, autoAlpha: 0, duration: 0.14, ease: "steps(2)" })
      .to(backdrop, { autoAlpha: 0, duration: 0.12, ease: "steps(2)" }, "<");
  };

  return createPortal(<div ref={backdropRef} className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <section ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="inspector-title" tabIndex={-1}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>FLIGHT 404 · CREW RECORD</p><h2 id="inspector-title">{definition.displayName}</h2><p className={styles.callsign}>{player.displayName}</p></div>
        <RetroButton type="button" aria-label="Close character status" onClick={requestClose}>Close</RetroButton>
      </header>
      <div className={styles.body}>
        <div className={styles.modelWindow} aria-label={`${definition.displayName} current animation: ${animationLabel(member.animationName)}`}>
          {ghost ? <div className={styles.ghostFigure} aria-hidden="true">†</div> : <Canvas dpr={1} camera={{ position: [0, 1.45, 3.25], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 0.9, 0)} gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}>
            <color attach="background" args={["#111317"]} /><ambientLight intensity={1.65} /><directionalLight position={[2.5, 4, 3]} intensity={2.2} />
            <Suspense fallback={null}><CharacterModel tint={definition.tint} characterId={definition.id} modelUrl={definition.modelUrl} animationName={member.animationName} animationOnce={member.animationOnce} animationHoldAtEnd={member.animationHoldAtEnd} animationEventId={member.animationEventId} animationStartedAt={member.animationStartedAt} serverClockOffsetMs={serverClockOffsetMs ?? 0} showGroundMarker={false} /></Suspense>
          </Canvas>}
          <div className={styles.animationStrip}><span>RUNNING ANIMATION</span><strong>{ghost ? "Dead pose" : animationLabel(member.animationName)}</strong></div>
        </div>
        <section className={styles.statsSection} aria-label="Character stats">
          <div className={styles.statusLine}><span>Condition</span><strong data-status={member.status}>{ghost ? "GHOST" : "ALIVE"}</strong><span>Connection</span><strong data-connected={player.connected}>{player.connected ? "LINKED" : "LOST"}</strong></div>
          <h3>PERSONAL CONDITION</h3>
          {character ? <div className={styles.statsGrid}>{statLabels.map((stat) => <div className={styles.stat} key={stat} data-low={character.resources[stat] <= 25}>
            <div><span>{stat}</span><b>{character.resources[stat]}%</b></div><span className={styles.meter}><i style={{ width: `${character.resources[stat]}%` }} /></span>
          </div>)}</div> : <p className={styles.empty}>No personal condition data is available.</p>}
          {member.behaviorLabel && <div className={styles.behavior}><span>Current behavior</span><strong>{member.behaviorLabel}</strong></div>}
          {member.startingItemId && <div className={styles.behavior}><span>Carried item</span><strong>{member.startingItemId}</strong></div>}
          {profile && <div className={styles.traits}>
            <div><span>Good at</span><strong>{profile.strengths.join(" · ")}</strong></div>
            <div><span>Struggles with</span><strong>{profile.flaws.join(" · ")}</strong></div>
          </div>}
        </section>
      </div>
    </section>
  </div>, document.body);
}
