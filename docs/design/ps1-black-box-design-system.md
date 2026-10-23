# PS1 Black-Box Design System

Status: approved implementation contract, 2026-10-22.

This is the single operational design system for the game UI. It turns the
visual direction into reusable decisions so a new screen, feature, or
development tool still feels like it came from the same late-1990s survival
game. The art-direction companion is [Visual Direction](visual-direction.md).

## The feeling to preserve

This is not “retro UI” in general. It is a recovered flight safety card wired
to a failing console after an absurd island crash:

- **Paper** holds the human story: a decision, passenger manifest, or incident
  report.
- **Instrument housings** hold live state: time, connection, route condition,
  and developer controls.
- **Hardware switches** carry deliberate action. They are squared, labeled,
  physical, and visibly selected or disabled.
- **The 3D island is the lead actor.** UI frames the decision; it does not
  turn the game into a dashboard.

Avoid generic rounded cards, glass layers, soft floating shadows, decorative
gradients, default dashboard graphs, neon cyberpunk, fake terminal noise, and
pixel fonts for long body copy. The original PS1 feeling comes from constrained
materials, low-resolution world rendering, hard edges, sparse instrument
labels, and purposeful imperfections—not nostalgia decoration.

## Foundations

### Tokens

[`black-box-design-system-v2.json`](black-box-design-system-v2.json) is the
machine-readable v2 contract; `src/styles/tokens.css` is its implementation
source for all shared tokens.
Do not add a one-off color, spacing value, shadow, z-index, font, or timing
constant in a component when a shared token is appropriate.

| Token | Role | Never use it as |
| --- | --- | --- |
| `--night-canopy` `#141A1D` | console face, deep shadow, dark text | a low-contrast body-text substitute |
| `--dusk-violet` `#42364D` | dusk field and quiet secondary surface | a default card background |
| `--paper-bone` `#D9D2BB` | safety card, readable light text | disabled-state color alone |
| `--flare-orange` `#E56B3F` | danger, crash, irreversible-risk accent | the only indication of danger |
| `--vest-yellow` `#E8C547` | countdown, focus, selected/host attention | a generic highlight everywhere |
| `--sea-glass` `#68A89A` | operational, positive, ghost/connection state | success without label or icon |

Spacing uses the 4px scale (`--space-1` through `--space-8`). Shared surfaces
use `--border-hard` and `--shadow-hard`; components may use a clipped corner
only when it communicates paper or hardware housing. Type roles are fixed:
Silkscreen for short labels/headings and IBM Plex Mono for body, values, forms,
and timers.

### Layout and density

- Desktop live play reserves the center and lower-middle of the scene. Persistent
  HUD should normally cover no more than 25% of the viewport.
- A decision recorder or incident report replaces the previous large surface;
  do not stack multiple large panels over the scene.
- Mobile is a true reflow, never a miniature desktop. Keep touch targets at
  least 44px and place the active action above the safe area.
- Development pages may be denser because they are operators’ tools. Use an
  asymmetric control rail and a labeled live-stage, never a SaaS dashboard grid.

### Motion and accessibility

Motion is an acknowledgement, not wallpaper: presses have a short mechanical
shift; route/ending changes may get one deliberate reveal. All non-essential
motion respects `prefers-reduced-motion`.

Every interactive element has a visible amber focus state, semantic native
control, keyboard operation, and text/shape in addition to color. Timed or
modal-like game decisions move focus to their heading/panel and retain a visible
focus treatment. State changes that matter are announced politely without
announcing every timer tick.

## Atomic component contract

| Layer | Purpose | Approved inventory |
| --- | --- | --- |
| Foundations | Tokens, reset, page-wide type/motion rules | `src/styles/{tokens,reset,global}.css` |
| Atoms | One visual or interaction primitive; no snapshot/game flow | `RetroButton`, `PixelLabel`, `StatusBadge`, `ResourceMeter`, `Divider`, `FocusRing` |
| Molecules | A small composition with its own clear responsibility | `VoteOption`, `PlayerRow`, `SessionCode`, `ConnectionBanner`, `Countdown` |
| Organisms | A complete game surface built from lower layers | roster, character selector, decision console, incident report, assignment/private choice, motorboat status, settings, ending, crash choice, character status |
| Screens | Compose organisms, attach snapshot/connection state, own route layout | game screen, sandbox, UI Lab, development previews |

### Composition rules

1. **Reuse before creating.** A new action begins with `RetroButton`; a short
   instrument caption begins with `PixelLabel`; state begins with `StatusBadge`
   or explicit text. Development-only pages follow this rule too.
2. **Promote only on a second use.** A one-off narrative arrangement belongs in
   its organism or screen CSS. Extract a new atom/molecule once two independent
   consumers need the same behavior and visual treatment.
3. **Keep responsibilities narrow.** Atoms do not know rules or server state.
   Molecules do not call the server. Organisms receive typed data/callbacks.
   Screens connect hooks, routes, and presentation.
4. **No visual forks.** A screen may arrange paper, instrument, and hardware
   differently, but it must use the shared tokens and approved primitives.
5. **No component without states.** For a relevant interactive component,
   implement default, hover, active, disabled, selected, focus-visible,
   loading/waiting, and reduced-motion behavior before it is considered shared.

## Component recipes

### Actions

Use `RetroButton` for general action controls. `primary` is a committed/proceed
action (yellow); `danger` signals cost or risk (orange); `default` is a quiet
dark hardware action. Never make danger the sole cue—pair it with a direct verb
such as “Leave alone now” or “Show death.”

Vote options are a dedicated molecule, not ordinary buttons: their numbered key,
choice color, selected marker, and locked state are part of the decision
recorder. Keep decision copy in sentence case.

### Information

Use a dark instrument housing for live counters, route state, codes, and
connection. Use a paper panel for authored content and factual aftermath.
`ConsequencePanel` is the canonical incident-report pattern; do not invent a
new pastel report card on a screen.

### Status and risk

Show a plain-language label with every status color. Risk remains descriptive,
not a raw percentage, unless a future approved system says otherwise. Preserve
the established language: *favorable*, *uncertain*, and *risky*.

### Focus and timed choices

An assignment, private decision, and ending are moments of attention change.
They receive focus when they appear, display an amber focus outline, explain the
timeout/default, and leave the next action obvious. Do not build focusless
custom div buttons or hide a critical action behind hover.

## Approval and change process

Before merging a shared UI change:

1. Check it against this document and `tokens.css`.
2. Add/adjust a focused component test for its behavior and state.
3. Exercise it in `/ui-lab` or a deterministic preview.
4. Review a desktop and a 390px-wide browser screenshot, plus keyboard focus
   and reduced motion when motion is present.
5. If it introduces a repeated primitive, add it to the inventory above;
   otherwise keep it screen-local.

The UI Lab is the acceptance surface for component states. The motorboat and
encounter previews are acceptance surfaces for 3D composition. A passing build
does not substitute for either review.
