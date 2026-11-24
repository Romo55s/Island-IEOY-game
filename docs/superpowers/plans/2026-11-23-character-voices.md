# Character Voices Implementation Plan

> **For agentic workers:** Execute inline in this session. The referenced superpowers execution helper is unavailable; use the repository tools and verify each task directly.

**Goal:** Clean the supplied voice clips, assign consistent cast voices and accompany sequential typed dialogue with speech gestures and audio.

**Architecture:** Reuse the existing Howler audio system and settings. A client dialogue clock drives visible text and the active speaker; recorded sample playback follows that clock without modifying server state.

**Tech Stack:** Python/FFmpeg asset processing, TypeScript/React, Howler, Vitest and Playwright.

**Spec:** `docs/design/2026-11-23-character-voices.md`.

## Global constraints

Preserve source recordings. No cloning/TTS, gameplay changes or new dependencies. Playback respects user gestures, hidden-tab cleanup, volume, and reduced motion. Full text remains accessible. A separately requested typing file must be identified before import.

### Task 1: Clean assets and stable assignment

Files: `scripts/prepare-character-voices.py`, `public/audio/voices/`, `src/audio/characterVoices.ts`, `tests/shared/characterVoices.test.ts`.

- [x] Probe labeled source recordings, trim only outer silence, filter, normalize, fade and strip metadata; export mono 24 kHz MP3 and JSON measurements.
- [x] Shuffle each supplied pool with a fixed seed and write explicit assignments for all 16 cast IDs; reuse male samples evenly, with female samples assigned to the five female cast members.
- [x] Validate coverage, pool membership, output paths, decoded peaks and metadata.

### Task 2: Audio lifecycle and readable typing

Files: `src/audio/audioSystem.ts`, `audioSettings.ts`, `src/game/story/dialoguePlayback.ts`, `useDialoguePlayback.ts`, `src/game/screens/StoryIncidentRoom.tsx`, its CSS, `src/ui/organisms/SettingsDrawer.tsx`.

- [x] Add voice volume with backward-compatible settings and one active stoppable voice; never queue hidden or stale lines.
- [x] Use authored line order and a monotonic local clock, roughly 38 characters/second plus punctuation and a short between-line pause; handle empty/finished lines.
- [x] Tie audio and existing portrait gesture to the active line. Provide full-text accessibility, show-all, reduced motion, and history silence.
- [x] Test lifecycle: no overlap/restart on snapshot updates, phase cleanup, missing audio, mute, hidden tab, skip and reduced motion.

### Task 3: Audition and verification

Files: `src/game/screens/SoundTestScreen.tsx`, `e2e/character-voices.spec.ts`, `docs/qa/character-voices.md`, `docs/licenses/assets.md`.

- [x] Add per-character audition using the same assigned clip.
- [x] Remove the old live synthetic radio sting; verify live/preview integration on desktop and mobile using the game-playtest skill.
- [x] Run focused tests, typecheck, build/bundle check; record signal measurements and screenshots. Do not claim subjective audio listening if unavailable.

## Completion — 2026-11-23

Implemented and verified locally. Export format is 40 kbps MP3 (the installed FFmpeg lacks libvorbis); 11 clips total 457,728 bytes. Audio assignments, 37 focused tests, typecheck, browser checks and build/bundle evidence are recorded in `docs/qa/character-voices.md`. A separately requested typing-sound file remains unidentified: the supplied character recordings currently accompany the typing. No deployment.
