# Character voices and typed dialogue — QA

Implemented and verified locally on 2026-11-23. No deployment or commit performed.

## Behavior

Eleven user-supplied recordings are cleaned and assigned to all 16 characters. Assignment is a saved seeded shuffle, independent of gameplay RNG. The five female characters receive distinct clips from the six-file female pool; eleven male characters share five male clips evenly. `src/audio/characterVoices.ts` is the explicit mapping and `/sound-test` has individual audition buttons.

The current authored crew exchange reveals one line at a time in speaker order, at approximately 38 characters/second with punctuation pauses. As text appears, the active character's assigned recording is cut into short voiced grains and scheduled at vowel positions in that line. A strong 4-bit waveshaper, character-specific pitch range and short envelopes make them read as retro speech blips instead of full unrelated spoken sentences. The active character uses the report's speaking gesture and a small portrait bob; other portraits rest. Opening exchanges and consequence exchanges use the same live StoryIncidentRoom component. Historical transcript entries stay silent. The previous synthetic radio sting no longer fires during live reports.

Voice playback respects the browser's audio unlock, Howler master gain, the Voices volume slider, hidden-tab cleanup, exchange changes, skip and unmount. Loading callbacks are cancelled along with playback so a slow file cannot speak after its turn or play missed syllables in a burst. Missing audio leaves text functional. Full text stays available to assistive technology without per-character live announcements. Reduced motion reveals full text immediately and removes the speaker gesture while retaining optional audio. Show full conversation reveals every line and stops the voice.

The mobile shared portrait canvas now renders above the open crew drawer, below modals; the canvases remain pointer-transparent. This fixed blank portrait slots in the mobile dialogue view. Asset readiness is awaited before taking the final screenshot.

## Audio preparation

Run `python3 scripts/prepare-character-voices.py /path/to/source-folder` to reproduce. The script preserves originals, retains internal pauses, trims qualifying outer silence, applies a 180 Hz high-pass, 5 kHz low-pass, 6 dB noise reduction, gentle 2.2:1 compression, softened 8-bit blend at 20%, down/up sampling through 11.025 kHz, faint 14 Hz amplitude modulation and short echo. It performs measured two-pass normalization targeting -23 LUFS / -6 dBTP with short edge fades. Output is mono 24 kHz, 40 kbps MP3. During dialogue, playback uses a gentler 64-step (6-bit) waveshaper, then a live Voices-volume bus capped at 20% before the master gain. The installed FFmpeg lacks libvorbis, so broadly compatible MP3 is used. Combined runtime size is listed in the audio manifest.

FFprobe verified no format or stream metadata tags remain. The public manifest records sanitized filenames, source hashes, exact trim amounts and measured results, without absolute local paths. All decoded true peaks are below -6 dBTP. The few louder-crest recordings remain slightly quieter to preserve headroom.

| Clip | Source filename | Duration | Integrated LUFS | True peak dBTP |
| male-1 | Voice game men 1.m4a | 4.49s | -23.43 | -6.7 |
| male-2 | Voice game men 2.m4a | 4.00s | -23.43 | -9.26 |
| male-4 | Voice men 4.m4a | 5.95s | -23.41 | -8.23 |
| male-5 | Voice man 5.m4a | 7.65s | -23.51 | -7.76 |
| male-6 | Voice man 6.m4a | 3.66s | -23.46 | -7.47 |
| female-1 | Voice game woman 1.m4a | 4.59s | -23.45 | -8.59 |
| female-2 | Voice game woman 2.m4a | 5.33s | -23.46 | -10.78 |
| female-3 | Voice woman 3.m4a | 5.37s | -23.44 | -8.74 |
| female-4 | Voice woman 4.m4a | 6.18s | -23.45 | -10.3 |
| female-5 | Voice woman 5.m4a | 4.26s | -23.45 | -9.03 |
| female-6 | Voice woman 6.m4a | 5.20s | -23.44 | -8.19 |

The revised export uses a lighter crusher blend and lower playback gain; its decoded true peaks are all below -6 dBTP and integrated levels remain within 0.1 LU. These are signal-level and decode/playback checks. The sound-test page allows the owner to audition each assignment.

## Verification

- `npm run typecheck`: passed for app and Worker.
- Focused tests in characterVoices, dialoguePlayback, characterVoiceAudio, crewDialogue and consequencePanel: 5 files / 37 tests passed.
- `e2e/character-voices.spec.ts`: 3 browser scenarios passed, including actual Howler play state, typed-text progression and skip, reduced-motion mobile radio and voice volume, and failed asset loading.
- `e2e/crew-dialogue.spec.ts`: existing full-cast dialogue/result regression passed when rerun alone. Its checkbox initially failed to change during a parallel browser run; the failure did not reproduce in the isolated check.
- `npm run build` and `npm run check:bundle`: passed. Existing large-chunk advisory remains.
- `git diff --check`: passed.

No server contracts or gameplay rules changed, so the Worker suite was not rerun. The broad suite's previously documented asset/roster setup failures were not modified by this feature.

Reviewed captures: [desktop during speech](../../output/qa/character-voices/desktop-speaking.png), [mobile radio with portraits](../../output/qa/character-voices/mobile-radio.png).

## Outstanding input

The user mentioned a separate sound to upload. No separately named typing/keyboard sound was present or identified during implementation; a filename was requested. The supplied voice recordings currently accompany the typewriter animation. A separate typing layer has not been fabricated or imported from an unrelated file.

## Follow-up: line cutoffs and report speaking animation

Dialogue voices now use short 4-bit voiced grains timed against the typewriter reveal. This avoids forcing every line to wait for an unrelated full recording and prevents full speech clips from being cut off mid-line. Playback remains one-shot and does not loop. The active speaker uses the portrait's agreement gesture and a small bob; reduced-motion users get the static portrait. This update was validated with typecheck, production build, deployment-bundle check and `git diff --check`.

The Voices slider now controls a shared dialogue gain bus in real time, including grains already scheduled for the current line. Maximum character voice output was reduced by half, and existing settings profiles migrate once to the 15% voice default while preserving other channels.
