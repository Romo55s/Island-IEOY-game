# Story Scene Art

The story-first session uses location illustrations as authored incident backdrops. Decision and event text remains live game content in the DOM; image files must never contain text or interface elements. Each scene uses the existing `public/images/crash-shore.png` as its color and rendering reference.

## Scene plates

| File | Used by | Scene prompt intent |
| --- | --- | --- |
| `wreckage-lighter.webp` | `wreckage-lighter` | Damaged fuselage and one recoverable emergency item on the crash beach at dusk. |
| `jungle-forage.webp` | `coconut-jury`, `mystery-berries` | Palm and broad-leaf food sources in a dark jungle clearing. |
| `boar-encounter.webp` | `boar-diplomacy` | Plausible wild boar standing beside camp supplies in a jungle clearing. |
| `coastal-signal.webp` | `smoke-signal`, `distress-flare`, `raft-committee` | Dark volcanic coast, improvised raft, signal light, and distant horizon. |
| `cliff-shelter.webp` | `shelter-politics`, `rainwater-budget`, `cave-of-bad-ideas` | Primitive shelter under a volcanic cliff, cave mouth, stream, and gathering storm. |
| `motorboat-cove.webp` | `motorboat-discovery`, `motorboat-repair`, `motorboat-recovery`, `motorboat-group-launch` | Damaged but repairable motorboat wedged in a sheltered volcanic cove. |
| `shelter-secured.jpg` | `cover-secured`, successful cliff shelter | Completed palm-and-driftwood shelter in the first storm, shown only after it is secured. |
| `signal-rescue.jpg` | `signal-rescue` ending | Passing rescue vessel turns toward the island's flare signal. |
| `signal-failure.jpg` | Failed radio, flare, or smoke signal outcome | Signal dies in the storm as the distant ship disappears beyond the headland. |
| `motorboat-storm.jpg` | Failed motorboat launch and storm-surge ending | Boat driven back onto the cove rocks by a storm; damaged but still recognizable. |
| `motorboat-escape.jpg` | `group-escape`, `solo-escape` endings | Patched boat clears the reef at dawn with the island receding behind it. |

Scene plates use a 1672 × 941 landscape frame and are stored as WebP or JPEG for runtime use. The original six plates were generated as low-poly, late-1990s survival-game art; the five outcome plates were generated from ChatGPT image generation after the connected Magnific account ran low on credits. Prompts request dark text-safe space at left, no text/UI, no frame, and broad angular forms. Images are scene illustrations, not isolated 3D modeling references.

Outcome plates are selected from authoritative resolved event data or ending state. They must not be shown during the decision that could produce that outcome.

## Visual use

- Keep game copy and controls in semantic HTML above the image layer.
- Crop with `object-fit: cover`; the left side remains dark for the incident title and summary.
- Use the established crash-shore image whenever an incident ID has no authored location mapping.
- Crew thought rows use the shared `CharacterPortrait` component. They remain monogram portraits until distinct approved character renders/models exist.
