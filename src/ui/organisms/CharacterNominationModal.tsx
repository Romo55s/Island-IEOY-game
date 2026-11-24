import { Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { OrthographicCamera } from "three";
import { Skull } from "pixelarticons/react/Skull.js";
import type { CharacterDefinition, Player } from "../../shared/domain";
import { CharacterModel } from "../../scene/characters/CharacterModel";
import styles from "./characterNominationModal.module.css";

interface CharacterNominationModalProps {
  roleLabel: string;
  selectionKind?: "assignment" | "target";
  description?: string;
  confirmLabel?: string;
  players: Player[];
  characterCatalog: CharacterDefinition[];
  eligibleCharacterIds: string[];
  selectedCharacterId: string;
  onSelect(characterId: string): void;
  onCancel(): void;
  onConfirm(): void;
}

function ClearModalCanvas() {
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
  }, 0);
  return null;
}

interface ModelWindowRect {
  characterId: string;
  centerX: number;
  bottomY: number;
  height: number;
}

function NomineeScene({ candidates, modelRects, openedAt }: { candidates: Array<{ characterId: string; modelUrl: string; tint: string }>; modelRects: ModelWindowRect[]; openedAt: number }) {
  const { camera, size } = useThree();
  const pixelsPerUnit = 100;
  useEffect(() => {
    const view = camera as OrthographicCamera;
    view.left = -size.width / (2 * pixelsPerUnit);
    view.right = size.width / (2 * pixelsPerUnit);
    view.top = size.height / (2 * pixelsPerUnit);
    view.bottom = -size.height / (2 * pixelsPerUnit);
    view.position.set(0, 0, 20);
    view.lookAt(0, 0, 0);
    view.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  const rectById = new Map(modelRects.map((rect) => [rect.characterId, rect]));
  return <>
    <ambientLight intensity={2.2} />
    <directionalLight position={[1.5, 2.5, 3]} intensity={2.2} />
    {candidates.map(({ characterId, modelUrl, tint }, index) => {
      const rect = rectById.get(characterId);
      if (!rect || !modelUrl) return null;
      const modelScale = Math.min(1, rect.height / (1.9 * pixelsPerUnit));
      return <group key={characterId} position={[(rect.centerX - size.width / 2) / pixelsPerUnit, (size.height / 2 - rect.bottomY) / pixelsPerUnit, 0]}>
        <group scale={modelScale}>
          <Suspense fallback={null}><CharacterModel tint={tint} characterId={characterId} modelUrl={modelUrl} animationName="look_around" animationEventId={`nomination-${characterId}`} animationStartedAt={openedAt - index * 420} showGroundMarker={false} /></Suspense>
        </group>
      </group>;
    })}
  </>;
}

export function CharacterNominationModal({ selectionKind = "assignment", description, confirmLabel, roleLabel, players, characterCatalog, eligibleCharacterIds, selectedCharacterId, onSelect, onCancel, onConfirm }: CharacterNominationModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const modelWindowRefs = useRef(new Map<string, HTMLSpanElement>());
  const [modelRects, setModelRects] = useState<ModelWindowRect[]>([]);
  const [openedAt] = useState(() => Date.now());
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const candidates = useMemo(() => {
    const eligible = new Set(eligibleCharacterIds);
    const characterById = new Map(characterCatalog.map((character) => [character.id, character]));
    return players.flatMap((player) => {
      if (!player.characterId) return [];
      const character = characterById.get(player.characterId);
      return [{
        player,
        characterId: player.characterId,
        characterName: character?.displayName ?? player.characterId,
        modelUrl: character?.modelUrl ?? "",
        tint: character?.tint ?? "#746b5d",
        canBeNominated: player.status === "alive" && eligible.has(player.characterId),
      }];
    });
  }, [characterCatalog, eligibleCharacterIds, players]);
  const modelCandidates = useMemo(() => candidates.map(({ characterId, modelUrl, tint }) => ({ characterId, modelUrl, tint })), [candidates]);
  const measureModels = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    setModelRects(candidates.flatMap(({ characterId }) => {
      const element = modelWindowRefs.current.get(characterId);
      if (!element) return [];
      const rect = element.getBoundingClientRect();
      return [{ characterId, centerX: rect.left - stageRect.left + rect.width / 2, bottomY: rect.bottom - stageRect.top, height: rect.height }];
    }));
  }, [candidates]);
  const selected = candidates.find(({ characterId }) => characterId === selectedCharacterId);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useLayoutEffect(() => {
    measureModels();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measureModels);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [measureModels]);

  if (typeof document === "undefined") return null;
  return createPortal(<div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className={styles.header}>
        <div><p>{selectionKind === "target" ? "CHOOSE TARGET" : "CREW ASSIGNMENT"}</p><h2 id={titleId}>{selectionKind === "target" ? roleLabel : `Nominate for ${roleLabel}`}</h2></div>
        <span className={styles.headerSignal} aria-hidden="true">LIVE CREW</span>
      </header>
      <p className={styles.instructions}>{description ?? (selectionKind === "target" ? "Choose a living target. Confirming casts your group vote for this character." : "Choose a living character for this task. Confirming casts your vote with this nominee.")}</p>
      <div className={styles.rosterStage} ref={stageRef}>
        <Canvas className={styles.modelCanvas} dpr={1} gl={{ alpha: true, antialias: false, powerPreference: "low-power" }} orthographic camera={{ position: [0, 0, 20], zoom: 1 }}>
          <ClearModalCanvas />
          <NomineeScene candidates={modelCandidates} modelRects={modelRects} openedAt={openedAt} />
        </Canvas>
        <div className={styles.candidateGrid} role="group" aria-label="Session characters" onScroll={measureModels}>
          {candidates.map(({ player, characterId, characterName, modelUrl, tint, canBeNominated }, index) => <button
            key={characterId}
            type="button"
            className={styles.candidate}
            data-selected={selectedCharacterId === characterId}
            data-eligible={canBeNominated}
            disabled={!canBeNominated}
            aria-pressed={selectedCharacterId === characterId}
            aria-label={`${characterName}, played by ${player.displayName}, ${canBeNominated ? "living and eligible" : player.status === "ghost" ? "dead" : "not eligible"}`}
            style={{ "--candidate-order": index } as CSSProperties}
            onClick={() => canBeNominated && onSelect(characterId)}
          >
            <span className={styles.modelWindow} ref={(element) => { if (element) modelWindowRefs.current.set(characterId, element); else modelWindowRefs.current.delete(characterId); }}>
              {!modelUrl && <span className={styles.noRender}>{characterName.slice(0, 2).toUpperCase()}</span>}
              {player.status === "ghost" && <span className={styles.ghostMark} aria-hidden="true"><Skull /></span>}
              {canBeNominated && <span className={styles.eligibilityMark}>LIVING</span>}
            </span>
            <span className={styles.identity}><strong>{characterName}</strong><small>{player.displayName}{!player.connected ? " · OFFLINE" : ""}</small></span>
          </button>)}
          {candidates.length === 0 && <p className={styles.empty}>No characters have joined the session yet.</p>}
        </div>
      </div>
      <footer className={styles.footer}>
        <p role="status">{selected ? `Selected: ${selected.characterName}` : "Select a living crew member to continue."}</p>
        <div><button type="button" className={styles.cancelButton} onClick={onCancel}>Cancel</button><button type="button" className={styles.confirmButton} disabled={!selected?.canBeNominated} onClick={onConfirm}>{confirmLabel ?? (selectionKind === "target" ? "Confirm target" : "Confirm nominee")}</button></div>
      </footer>
    </section>
  </div>, document.body);
}
