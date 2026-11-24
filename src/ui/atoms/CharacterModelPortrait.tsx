import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, View } from "@react-three/drei";
import { CharacterModel } from "../../scene/characters/CharacterModel";
import styles from "./characterModelPortrait.module.css";

function ClearPortraitCanvas() {
  // Drei's View renders each portrait through a scissor viewport and disables
  // autoClear. Clear the shared transparent canvas once before all views render,
  // so scrolled/unmounted portraits cannot remain painted at their old bounds.
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.clear(true, true, true);
  }, 0);
  return null;
}

export function CharacterModelPortrait({ characterId, modelUrl, tint, animationName = "idle", animationOnce = false, animationHoldAtEnd = false, animationEventId = "portrait", framing = "close" }: {
  characterId?: string;
  modelUrl: string;
  tint: string;
  animationName?: string;
  animationOnce?: boolean;
  animationHoldAtEnd?: boolean;
  animationEventId?: string;
  framing?: "close" | "full";
}) {
  const viewRef = useRef<HTMLDivElement | null>(null);
  // Start unloaded so the first render cannot request every roster GLB before
  // IntersectionObserver has had a chance to report which portraits are on screen.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = viewRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      // Older browsers still render portraits instead of leaving them blank.
      setVisible(true);
      return;
    }

    // The shared canvas is fixed to the viewport, so it bypasses overflow
    // clipping from radio/roster scroll panes. Hide a view whenever any of its
    // bounds are clipped; otherwise its model would bleed into neighboring UI.
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.999));
    }, { threshold: [0, 0.999, 1] });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <View ref={viewRef} visible={visible} className={styles.view} frames={Infinity} data-model-portrait="true" data-model-visible={visible} aria-hidden="true">
    <PerspectiveCamera makeDefault position={framing === "full" ? [0, 1.55, 3.05] : [0, 1.43, 1.32]} fov={framing === "full" ? 34 : 36} onUpdate={(camera) => camera.lookAt(0, framing === "full" ? 0.88 : 1.38, 0)} />
    <ambientLight intensity={2.2} />
    <directionalLight position={[1.5, 2.5, 3]} intensity={2.2} />
    {visible && <Suspense fallback={null}><CharacterModel tint={tint} characterId={characterId} modelUrl={modelUrl} animationName={animationName} animationOnce={animationOnce} animationHoldAtEnd={animationHoldAtEnd} animationEventId={animationEventId} showGroundMarker={false} /></Suspense>}
  </View>;
}

/** One shared WebGL context can render every portrait view in its containing surface. */
export function CharacterPortraitCanvasLayer({ className = "", aboveDrawer = false, aboveModal = false }: { className?: string; aboveDrawer?: boolean; aboveModal?: boolean }) {
  if (typeof document === "undefined") return null;
  if ((window as Window & { __IEOY_E2E_STATIC_PORTRAITS__?: boolean }).__IEOY_E2E_STATIC_PORTRAITS__) return null;
  return createPortal(<div className={className} style={{ position: "fixed", inset: 0, zIndex: aboveModal ? "calc(var(--layer-modal) + 1)" : aboveDrawer ? "calc(var(--layer-drawer) + 1)" : 5, pointerEvents: "none" }}>
    <Canvas className={styles.canvas} dpr={1} gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}>
      <ClearPortraitCanvas />
      <View.Port />
    </Canvas>
  </div>, document.body);
}
