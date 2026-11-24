# Island Crash Audio System Implementation Plan

> **For agentic workers:** Execution authorized by the user in this session. Implement inline; do not delegate.

**Goal:** Add original, locally bundled game sounds, connect them to gameplay and persistent volume controls, and provide a PS1-styled sound test page.

**Architecture:** Keep audio assets local and license-recorded through the existing public audio manifest. Use Howler.js for browser playback, a small audio settings store for master/music/effects levels, and a Node script to generate original compact WAV assets. Expose the sound audition page at a developer route and play selected cues from existing game phase and vote events.

**Tech Stack:** React, TypeScript, Howler.js, Web Audio compatible WAV files, existing CSS modules and design tokens.

**Spec:** `public/audio/manifest.json`, `docs/licenses/assets.md`, and the user's request for game effects plus an audition page.

## Global Constraints

- Sound files must be local and listed in the audio manifest with an explicit license record.
- Preserve existing game, networking, and phase behavior; audio must never block progression.
- Browser audio begins only after a user gesture.
- Preserve master, music, and effects as separate adjustable levels and persist their values locally.
- Sound test controls must be keyboard operable, labeled, responsive, and match the PS1 visual system.

---

### Task 1: Create licensed original cue assets

**Files:**
- Create: `scripts/generate-audio-assets.mjs`
- Create: `public/audio/cues/*.wav`
- Modify: `public/audio/manifest.json`
- Modify: `docs/licenses/assets.md`
- Modify: `tests/shared/audioManifest.test.ts` (update expected cue IDs only)

- [ ] Generate short original ambience, crash, radio, voting, reveal, fire, ghost, and UI selection cues.
- [ ] Keep each cue within its manifest size limit and record the generator as the source.
- [ ] Mark only locally present cues as available.

### Task 2: Add playback and persistent settings

**Files:**
- Create: `src/audio/audioSystem.ts`
- Create: `src/audio/useAudioSettings.ts`
- Modify: `src/ui/organisms/SettingsDrawer.tsx`

- [ ] Install Howler.js and expose `playSound`, `stopSound`, `setAudioSetting`, and `useAudioSettings`.
- [ ] Apply master volume globally and music/effects volume by cue category.
- [ ] Replace the read-only settings sliders with persistent labeled controls.

### Task 3: Add the sound audition page

**Files:**
- Create: `src/game/screens/SoundTestScreen.tsx`
- Create: `src/game/screens/SoundTestScreen.module.css`
- Modify: `src/app/App.tsx`

- [ ] Add a developer-only `/sound-test` route with cue descriptions, play/stop controls, and volume levels.
- [ ] Provide a clear return link and responsive keyboard-accessible controls.

### Task 4: Connect cues to the game

**Files:**
- Modify: `src/ui/atoms/RetroButton.tsx`
- Modify: `src/game/screens/GameSessionScreen.tsx`
- Modify: `src/game/screens/CrewAdmissionScreen.tsx`

- [ ] Play a restrained selection cue from shared action buttons.
- [ ] Play vote confirmation on submit and crash/reveal cues on corresponding phase changes.
- [ ] Start ambience only after an audio-unlocking user interaction; stop it on session exit.
- [ ] Ensure audio playback errors are swallowed and cannot affect gameplay state.

## Manual acceptance checks

- Open `/sound-test`, play each listed cue, and adjust each volume slider.
- Reload and confirm volume settings persist.
- Use keyboard navigation to focus and play a cue.
- In a session, confirm button, vote, crash, and report cues play at their intended events.
- Confirm muted/blocked audio does not interrupt voting or phase transitions.
