# Island Decision Game Visual Direction

## Core Concept

The interface looks like a damaged airplane safety card wired into a recovered black-box recorder. The 3D world supplies the late-1990s console atmosphere; the DOM interface stays crisp, readable, and intentionally sparse. The result should feel specific to this crash-survival comedy rather than like a generic game dashboard with a pixel font.

The memorable visual device is the **decision recorder**: each vote appears on a clipped-corner paper panel with tiny safety-diagram marks, while the countdown behaves like an amber cockpit instrument. During a consequence, that panel briefly becomes a stamped incident report.

## Core Palette

Use these six named colors as the base system. Opacity variants are allowed; adding more named colors requires a UI Lab review.

| Token | Hex | Use |
| --- | --- | --- |
| `night-canopy` | `#141A1D` | page background, deep shadows |
| `dusk-violet` | `#42364D` | sky, secondary surfaces |
| `paper-bone` | `#D9D2BB` | primary text, safety-card panels |
| `flare-orange` | `#E56B3F` | danger, selected action, crash accents |
| `vest-yellow` | `#E8C547` | countdown, focus, host state |
| `sea-glass` | `#68A89A` | positive resources, connection state, ghosts |

Use `night-canopy` text on light panels and `paper-bone` text on dark panels. Never rely on the orange/green distinction alone; pair state color with an icon, label, or texture.

## Typography

- Display and short labels: Silkscreen, subject to final OFL license verification before bundling.
- Body, inputs, timers, and codes: IBM Plex Mono, subject to final OFL license verification before bundling.
- Keep body copy at native DOM resolution. Pixelation belongs in the scene and display accents, not paragraphs or form fields.
- Use uppercase sparingly for instrument labels, not for full decision text.

## Shape and Material Language

- 4px spacing grid, 2px borders, hard 4px offset shadows.
- Clipped or chamfered corners derived from safety-card panels and instrument housings.
- Flat fills, paper grain, warning stripes, stamped marks, and restrained one-pixel noise.
- No glassmorphism, blurred translucent cards, pill-heavy SaaS styling, or equal-weight panels in every corner.
- Buttons feel like labeled hardware switches. Vote options feel like illustrated emergency procedures, not ordinary radio inputs.

## Desktop Play Layout

```text
+------------------------------------------------------------------+
| DECISION 04/10                         FOOD 62  HEALTH 81   [gear] |
|                                                                  |
|                 fixed isometric 3D island                        |
|                 characters remain readable                      |
|                 center stays unobstructed                        |
|                                                                  |
| [connection]                                                     |
|        +------------------------------------------------+        |
|        | safety-card question              00:12        |        |
|        | [1] option     [2] option     [3] option       |        |
|        +------------------------------------------------+        |
+------------------------------------------------------------------+
```

- One compact objective/round label at top left.
- One narrow resource strip at top right.
- Connection problems appear as a small edge banner and expand only when action is needed.
- The decision recorder appears only during reading/voting; the incident report replaces it during reveal.
- Settings, roster detail, rules, and accessibility controls live in a drawer or modal.
- Persistent HUD should occupy no more than roughly 25% of the desktop viewport and must preserve the center and lower-middle character staging area.

## Mobile Play Layout

```text
+----------------------------+
| 04/10        resources [^]  |
|                            |
|       isometric scene      |
|       reduced DPR/effects  |
|                            |
| +------------------------+ |
| | question        00:12  | |
| | [1] option             | |
| | [2] option             | |
| | [3] option             | |
| +------------------------+ |
+----------------------------+
```

- Collapse the resource strip to a single summary control.
- Stack vote choices vertically and keep the active action above the safe-area inset.
- Allow the decision recorder to cover more of the lower scene while voting, but return to a low-chrome scene during discussion and reveal.
- Do not shrink interactive targets below 44 CSS pixels merely to preserve the scene.

## Atomic Design Mapping

- Atoms: instrument label, icon, stamped badge, focus frame, meter segment, divider, button.
- Molecules: resource meter, vote procedure, player/character row, session-code block, countdown instrument, connection notice.
- Organisms: lobby roster, decision recorder, incident report, settings drawer, ending manifest.
- Screens: title/create, join, lobby, game, ending, and development-only UI Lab.

The UI Lab must show long names, all eight roster slots, alive/ghost/disconnected states, zero/full resources, validation errors, keyboard focus, reduced motion, and both desktop and mobile arrangements before screen assembly begins.

## 3D Scene Direction

- Fixed orthographic three-quarter camera with no player camera controls.
- Low-poly silhouettes, small textures, restrained dusk lighting, fog, stepped character animation, and optional vertex instability/dither.
- Preserve character silhouette separation through spacing and rim/ground contrast before adding post-processing.
- Use shared materials and procedural placeholder geometry for the first greybox.
- The crash intro should read from camera staging, smoke/fire shapes, sound if approved, and timed poses—not expensive physics.
- Ghosts retain their recognizable character silhouette using `sea-glass`, reduced opacity, a subtle vertical offset, and a distinct idle pose.

## Motion and Accessibility

- UI feedback is fast and stepped; large scene changes use deliberate holds rather than constant motion.
- Reduced motion replaces the crash movement with short crossfades and removes shake/flashing.
- The voting countdown updates visually every second but should not be announced by assistive technology every second. Announce voting open, ten seconds remaining, five seconds remaining, and closed.
- Keyboard defaults: `Tab`/`Shift+Tab` navigate, `Enter`/`Space` activate, number keys `1`–`3` select a visible vote choice, and `Escape` closes the topmost drawer or modal.
- Network and UI updates remain full-rate even when character animation is stepped.

## Quality Ladder

1. Full: capped low-resolution render, restrained jitter/dither, smoke/fire accents, stepped animation.
2. Reduced: lower device-pixel ratio, no vertex jitter, fewer particles, same geometry and gameplay.
3. Safe: basic materials and lighting, no post-processing, same camera, UI, and authoritative state.

The renderer may move down this ladder automatically after sustained performance below 30 FPS. It never changes rules, timers, or network behavior.

