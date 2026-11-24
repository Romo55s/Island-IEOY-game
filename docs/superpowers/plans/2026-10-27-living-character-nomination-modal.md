# Living Character Nomination Modal Implementation Plan

> **For agentic workers:** Follow this plan inline in the active session; the user has already requested implementation.

**Goal:** Replace the assignment nomination dropdown with a Black Box themed modal that lets players inspect session characters in 3D and select an eligible living nominee.

**Architecture:** Keep vote and nomination state in `DecisionConsole`. A reusable modal presents session characters, disables anyone outside the server-provided eligible list, and commits the nominee only after explicit confirmation. Render previews through one modal-local React Three Fiber canvas, and use CSS steps-based transitions rather than adding GSAP.

**Tech Stack:** React, TypeScript, CSS Modules, existing React Three Fiber portrait layer, project design tokens.

**Spec:** User request in the active conversation; Black Box Design System v2 already used by the game.

## Global Constraints

- Preserve server-authoritative eligible character IDs and existing vote submission behavior.
- Only a confirmed eligible character becomes the vote's assignment.
- Keep the modal keyboard accessible and respect reduced-motion preferences.
- Use the existing low-poly 3D character assets and shared canvas.
- Keep the Black Box palette, rectangular controls, pixel typography, metal framing, and PS1-era transitions.
- Do not add a new animation dependency or modify game rules.

---

### Task 1: Replace the assignment dropdown with an explicit modal flow

**Files:**
- Modify: `src/ui/organisms/DecisionConsole.tsx`
- Modify: `src/ui/organisms/PrivateChoicePanel.tsx`
- Modify: `src/game/screens/GameSessionScreen.tsx`
- Modify: `src/game/screens/MotorboatRoutePreviewScreen.tsx`
- Create: `src/ui/organisms/CharacterNominationModal.tsx`
- Create: `src/ui/organisms/characterNominationModal.module.css`
- Modify: `src/ui/organisms/organisms.module.css`

**Deliverable:** Assignment options open a nominee dialog; selecting and confirming an eligible survivor updates the existing nomination state and vote submission continues through the existing callback.

- [x] Add modal state keyed by the assignment option and a temporary selected character ID.
- [x] Replace the native select with a labeled button that shows the selected nominee or “Choose a living character.”
- [x] Build the roster from session players with claimed characters, resolve models through the merged character catalog, show alive/ghost state, and disable characters outside `eligibleCharacterIds`.
- [x] Render roster cards with 3D models in one modal-local canvas, plus character and player names.
- [x] Add explicit Confirm nominee and Cancel actions; only confirmation updates the assignment.
- [x] Close on Escape and backdrop click, keep focus within the dialog, and return focus to its trigger when closed.
- [x] Use a stepped PS1 reveal/selection animation and disable it under reduced motion.
- [x] Reuse the modal for the private fuel-transfer character target.

### Task 2: Validate the interaction in the running game

**Files:**
- No additional files unless validation exposes a layout defect.

**Deliverable:** Verify the modal opens from an assignment option, displays the current roster, prevents ineligible selection, updates the nominee label after confirmation, and still submits the vote correctly. Inspect desktop and narrow viewport layouts, then run `npm run typecheck`.

- [x] Use the existing decision test bench for a decision with an assignment.
- [x] Inspect desktop and narrow viewport geometry, 3D model framing, and nominee confirmation.
- [x] Run `npm run typecheck`; it passes.
