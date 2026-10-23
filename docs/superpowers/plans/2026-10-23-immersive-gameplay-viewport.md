# Immersive Gameplay Viewport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make active multiplayer gameplay a single full-viewport PS1 game scene with phase-aware overlays, without changing game state, networking, or Three.js simulation.

**Architecture:** Keep `SessionIslandView` mounted as the sole canvas owner. Move the live session branch in `GameSessionScreen` from a document grid to a viewport shell whose HUD, crew manifest, motorboat details, vote/phase surface, report, and pause settings are DOM overlays. Existing rule-driven components retain their inputs and callbacks.

**Tech Stack:** React 19, TypeScript, CSS Modules, React Three Fiber, PartySocket, Vitest, Playwright.

**Spec:** `docs/design/black-box-design-system-v2.json`; user-approved `Retro Island Survival Decision UI.png` in Downloads.

## Global Constraints

- Do not modify gameplay logic, multiplayer state, Three.js scene behavior, camera mode, raycasting, or server protocols.
- Keep `SessionIslandView` and its `GameCanvas` mounted while HUD/modal state changes.
- Use v2 metal `#393731`, inset `#111317`, edge `#746B5D`, cream `#E8E0C9`, muted `#B6AC9A`, amber `#D6AD32`, red `#B4312C`, teal `#6DAFA2`, and green `#5D9A73` tokens.
- No document-level scrolling during normal non-lobby gameplay; overlay interiors may scroll when their content is longer than the viewport.
- Keep native keyboard controls, semantic buttons, visible focus, Escape pause close, and reduced-motion behavior.

---

### Task 1: Preserve the canvas while enabling a viewport mode

**Files:**
- Modify: `src/game/screens/SessionIslandView.tsx`
- Modify: `src/game/screens/SessionIslandView.module.css`
- Test: `tests/client/sessionIslandView.test.tsx`

**Interfaces:**
- Consumes: existing `PublicGameSnapshot`, `GameCanvas`, `IslandScene`.
- Produces: `SessionIslandView` with optional `immersive?: boolean`, leaving its canvas and scene inputs unchanged.

- [ ] **Step 1: Add a failing render test for immersive mode**

```tsx
render(<SessionIslandView snapshot={snapshot} immersive />);
expect(screen.getByLabelText("Live island and crew")).toHaveAttribute("data-immersive", "true");
```

- [ ] **Step 2: Run the focused test**

Run: `npm test -- --run tests/client/sessionIslandView.test.tsx`
Expected: FAIL because `immersive` is not represented in the DOM.

- [ ] **Step 3: Add the optional prop without changing scene composition**

```tsx
export function SessionIslandView({ snapshot, freeCamera = false, sceneLabel, immersive = false }: Props) {
  return <section className={styles.view} data-immersive={immersive || undefined}>…</section>;
}
```

- [ ] **Step 4: Add viewport-mode CSS**

```css
.view[data-immersive="true"] { width: 100%; height: 100%; min-height: 0; margin: 0; border: 0; box-shadow: none; }
```

- [ ] **Step 5: Run the focused test and typecheck**

Run: `npm test -- --run tests/client/sessionIslandView.test.tsx && npm run typecheck`
Expected: PASS.

### Task 2: Build the active-game viewport shell and compact HUD

**Files:**
- Modify: `src/game/screens/GameSessionScreen.tsx`
- Modify: `src/game/screens/GameSessionScreen.module.css`
- Modify: `src/ui/molecules/SessionCode.tsx`
- Modify: `src/ui/molecules/ConnectionBanner.tsx`
- Test: `e2e/full-session.spec.ts`

**Interfaces:**
- Consumes: `snapshot`, `viewerCharacterState`, `connectionStatus`, `SessionIslandView`, `SessionCode`, `ConnectionBanner`.
- Produces: an active-game DOM shell with `sessionViewport`, compact identity/resource/session HUD zones, and no permanent right settings rail.

- [ ] **Step 1: Add optional `className` props to the two compact session molecules**

```tsx
export function SessionCode({ code, className = "" }: { code: string; className?: string }) { … }
export function ConnectionBanner({ state, className = "" }: { state: State; className?: string }) { … }
```

- [ ] **Step 2: Replace only the non-lobby `sessionGrid` markup with a viewport shell**

```tsx
<main className={`${styles.page} ${styles.gameplayPage}`}>
  <section className={styles.sessionViewport}>
    <SessionIslandView snapshot={snapshot} immersive />
    <header className={styles.gameplayHud}>…</header>
    <section className={styles.phaseOverlay}>…existing phase component…</section>
  </section>
</main>
```

- [ ] **Step 3: Use actual viewer resources only**

```tsx
{viewerCharacterState && (["food", "health", "morale", "water"] as const).map((resource) => …)}
<span><b>shelter</b><strong>{snapshot.resources.shelter}</strong></span>
```

- [ ] **Step 4: Add viewport CSS and responsive HUD grid**

```css
.gameplayPage { height: 100dvh; min-height: 0; padding: 0; overflow: hidden; }
.sessionViewport { position: relative; isolation: isolate; height: 100%; overflow: hidden; }
.gameplayHud { position: absolute; inset: 12px 12px auto; z-index: var(--layer-hud); pointer-events: none; }
.gameplayHud > * { pointer-events: auto; }
```

- [ ] **Step 5: Run the active-session Playwright flow**

Run: `npx playwright test e2e/full-session.spec.ts`
Expected: Existing create/join/lobby/gameplay flow remains functional; the renderer remains visible.

### Task 3: Convert secondary gameplay surfaces into collapsible overlays

**Files:**
- Modify: `src/game/screens/GameSessionScreen.tsx`
- Modify: `src/game/screens/GameSessionScreen.module.css`
- Test: `e2e/full-session.spec.ts`

**Interfaces:**
- Consumes: `LobbyRoster`, `PanelFrame`, `MotorboatStatusPanel`, `SettingsDrawer`, `connection.leave`.
- Produces: crew manifest, motorboat detail, and pause/settings overlays controlled by local UI state only.

- [ ] **Step 1: Add local UI state**

```tsx
const [manifestOpen, setManifestOpen] = useState(false);
const [motorboatOpen, setMotorboatOpen] = useState(false);
const [pauseOpen, setPauseOpen] = useState(false);
```

- [ ] **Step 2: Add Escape handling and return focus to the pause button**

```tsx
useEffect(() => {
  const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setPauseOpen(false);
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, []);
```

- [ ] **Step 3: Render compact controls plus conditionally mounted detail overlays**

```tsx
<button aria-expanded={manifestOpen} onClick={() => setManifestOpen((open) => !open)}>Crew · {connectedPlayers.length}/8</button>
{manifestOpen && <aside className={styles.manifestOverlay}><PanelFrame …><LobbyRoster players={snapshot.players} /></PanelFrame></aside>}
```

- [ ] **Step 4: Put existing `SettingsDrawer` inside an Escape-closeable dialog with Return and Leave actions**

```tsx
{pauseOpen && <section className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-label="Black-box pause menu">
  <SettingsDrawer />
  <ActionButton onClick={() => setPauseOpen(false)}>Return to game</ActionButton>
  <ActionButton onClick={leaveSession}>Leave session</ActionButton>
</section>}
```

- [ ] **Step 5: Add desktop/mobile overlay positioning and internal scroll constraints**

```css
.manifestOverlay, .routeOverlay { position: absolute; z-index: var(--layer-drawer); max-height: min(68dvh, 680px); overflow: auto; }
.pauseOverlay { position: absolute; z-index: var(--layer-modal); inset: 0; display: grid; place-items: center; }
```

- [ ] **Step 6: Test keyboard and panel behavior**

Run: `npx playwright test e2e/full-session.spec.ts`
Expected: crew/motorboat panels do not resize or unmount the canvas; Escape closes pause; Leave remains available.

### Task 4: Make phase content focused overlays rather than document sections

**Files:**
- Modify: `src/game/screens/GameSessionScreen.tsx`
- Modify: `src/game/screens/GameSessionScreen.module.css`
- Test: `tests/client/consequencePanel.test.tsx`, `e2e/full-session.spec.ts`

**Interfaces:**
- Consumes: existing `CrashChoiceScreen`, `DecisionConsole`, `AssignmentResponsePanel`, `PrivateChoicePanel`, `ConsequencePanel`, `EndingSummary`.
- Produces: a `phaseOverlay` wrapper with phase-specific max widths/heights; no gameplay phase component is rewritten or receives invented data.

- [ ] **Step 1: Preserve the existing phase ternary as `phaseContent`**

```tsx
const phaseContent = snapshot.phase === "decision" ? <DecisionConsole … />
  : snapshot.phase === "reveal" ? <ConsequencePanel … />
  : …;
```

- [ ] **Step 2: Place that content over the persistent scene**

```tsx
{snapshot.phase !== "ending" && <section className={styles.phaseOverlay} data-phase={snapshot.phase}>{phaseContent}</section>}
```

- [ ] **Step 3: Add intentional phase positions**

```css
.phaseOverlay { position: absolute; z-index: var(--layer-hud); right: 50%; bottom: 18px; width: min(760px, calc(100% - 32px)); max-height: min(46dvh, 460px); transform: translateX(50%); overflow: auto; }
.phaseOverlay[data-phase="decision"] { width: min(920px, calc(100% - 32px)); }
.phaseOverlay[data-phase="reveal"] { max-height: min(70dvh, 680px); }
```

- [ ] **Step 4: Run component and E2E tests**

Run: `npm test -- --run tests/client/consequencePanel.test.tsx && npx playwright test e2e/full-session.spec.ts`
Expected: report data and vote interactions retain their existing behavior.

### Task 5: Visual and regression verification

**Files:**
- Modify if expected visual change is accepted: `e2e/visual.spec.ts-snapshots/*`
- Test: `e2e/full-session.spec.ts`, `e2e/visual.spec.ts`, `npm run check`

- [ ] **Step 1: Capture desktop and 390px screenshots of an active game state**

Run: `npx playwright test e2e/visual.spec.ts --update-snapshots`
Expected: snapshots show the scene as the dominant layer and no normal-game document scroll.

- [ ] **Step 2: Check keyboard and reduced motion manually**

Run: `bash /Users/tonyromo55/.codex/skills/playwright/scripts/playwright_cli.sh open http://127.0.0.1:5174/`
Expected: Tab focus remains visible; Escape closes pause; reduced-motion does not produce continuous HUD motion.

- [ ] **Step 3: Run the full verification suite**

Run: `npm run check && npx playwright test`
Expected: typecheck, worker/client tests, build, bundle check, and browser flows pass.
