# Crew History Director — Feature Spec v1

> Historical document, archived 2026-10-18. Original decisions, instructions, and checkboxes below describe earlier work; they are not the active specification or backlog. Use the [current project index](../../../README.md) for implementation status and next work. Old repository paths are retained as historical references.

## Overview

Make the playable crew feel like a group that remembers what happened, while keeping all multiplayer outcomes server-authoritative. At the moment the history log mainly contains prose, so the renderer cannot reliably tell whether the group had a rescue, a success, a loss, or a starvation scare. The Worker will expose compact event facts; a deterministic client director will turn those facts and the cast profiles into a readable social beat.

## Player-facing behavior

1. Between decisions, the crew travels together to the encounter zone using the existing walk clip.
2. During a reveal, the last resolved event sets one shared beat. A successful rescue can reunite rescuer and rescued; a shared win can produce a quick celebration; a setback can produce a complaint and a mediator's response; a death or starvation scare prioritizes the fall clip and nearby concern.
3. Character profiles and survival state personalize idle/reaction choices. Characters with empathetic/steady traits are more likely to comfort or steady the crew; bold/joker/tinkerer profiles can choose visibly different nonverbal reactions. The presentation uses their existing profile dialogue rather than inventing personal blame.
4. If every living character has zero food during a reveal, the crew can have a deterministic dark-comedy hunger exchange: one character floats the cannibalism idea, another objects or redirects toward finding food. Death/mourning beats take precedence. This is dialogue and staging only; nobody is consumed and no resources or statuses change.
5. During reveals, survivors show a readable context action: search for food when personally hungry, check on a wounded crewmate after danger, recover during a quiet moment, or react socially to the event. Labels and clips are derived from the same public snapshot on every client.
6. The next encounter clears the previous beat and routes the crew to the next staging area.

## Data model

Each resolved decision event carries `decisionId`, `winningOptionId`, `outcomeId`, and explicit death IDs. Crash events retain the structured rescue attempts already present in the public crash-resolution object. These fields are descriptive history only; they do not change vote privacy or game rules.

## Determinism and fairness

- Same public snapshot and profiles must produce the same zone, partner, clips, and lines on every client.
- At most one pair is staged for a close interaction; all other members keep readable spacing.
- Never infer individual responsibility from a team vote. The game currently exposes only aggregate votes.
- Ghosts do not eat or move resource state; they can remain part of social staging as ghosts.
- Hunger banter requires at least one living character and zero food for all living characters; a ghost's resources do not prevent or trigger it.
- The director cannot submit choices, change health/resources, choose targets, or resolve a phase.
- Food-search and aid are presentation intent only; characters do not generate food, transfer inventory, or heal one another in this feature.

## Tuning and validation

This is a presentation/characterization layer, not a competitive balance system. Tests assert deterministic mappings and correct use of recorded facts; they do not invent numeric balance targets. Playtests should assess whether reactions read clearly, feel appropriately varied, and avoid cluttering the 3D scene.

## Scope and risks

The behavior loop is a pure client resolver plus readable action labels in the existing session roster. It reuses the existing character GLB and animation library. It does not introduce free-roaming autonomous agents, hidden AI votes, persistent relationship scores, new clips, or per-player blame. Gathering, inventory transfer, and healing remain visual intentions only until their authoritative rules are separately designed.

## Open follow-up

After a few full-session playtests, decide whether pair-specific trust should become persistent gameplay state. Until individual action attribution and desired consequences are designed, do not turn relationship scores into vote modifiers or survival bonuses.
