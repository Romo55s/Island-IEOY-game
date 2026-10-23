# Connected escape routes — v1

## Intent

Escape is not a ten-card checklist. It is a race between three imperfect projects:

- **Motorboat:** fast, selfish, and mechanically risky.
- **Plane signal:** climb the ridge, assemble a signal, and gamble on a flyover.
- **Rescue boat:** keep enough people alive for three days, then make the coast visible when a supply boat passes.

The crew must be able to abandon one project, return to it later, or use progress made for one project to improve another. This keeps decisions consequential without requiring a huge, isolated branching tree.

## Authoritative rules

1. A major public resolution advances the authoritative `day` clock by one. Private motorboat choices do not advance it.
2. Day three creates the rescue-boat window. It does not guarantee rescue: the crew still needs a visible shore marker, a maintained beacon, or radio contact.
3. A completed ridge beacon creates a plane window. A flare improves its chance of success; radio contact can make a rescue certain.
4. Motorboat salvage can create a reflector and repair parts. The reflector helps the plane signal and the shore marker. Signal materials can help the rescue boat find the shore.
5. Each route can end the session. A successful collective signal or pickup is a `group-escape`; a later private variant can add selfish outcomes, but v1 keeps private betrayal exclusive to the motorboat so the information rules remain legible.
6. Route failures cost resources, injuries, time, or a missed opportunity. Only the motorboat's third missed launch is immediately terminal. The day-three route fails fairly by exposing the crew to one final storm decision if they have no viable signal.
7. The director chooses the next available authored project card, not a shuffled generic deck. A project card exposes a real choice that changes project state; the group never sees a fake progress meter.

## Shared state and transitions

```text
crash
  └─ escape-project hub
       ├─ motorboat discovery → fuel secret → repair → launch
       │      └─ salvage reflector ───────────────┐
       ├─ ridge search → signal materials → beacon → plane window
       │      └─ radio contact ───────────────────┼─ stronger rescue boat pickup
       └─ camp watch → shore marker → survive days 1–3 → boat window
              └─ maintained supplies ─────────────┘
```

The route director may surface another incomplete project after every reveal. It prioritizes time-sensitive windows first (plane, then day-three boat), then unfinished projects. As a result, working on the beacon can unlock a boat rescue; salvaging the motorboat can provide the ridge reflector; and using the flare for a plane means the rescue boat must rely on its marker instead.

## V1 content map

| Route | Cards | Shared links | End condition |
| --- | --- | --- | --- |
| Motorboat | Wreck discovery, repair, launch/recovery | Wreckage can yield reflector/repair parts | Existing group/solo ending or three missed launches |
| Plane signal | Ridge search, build beacon, plane window | Reflector or flare improves signal; radio makes it certain | Group rescue on success; time/injury setback on miss |
| Rescue boat | Prepare shore, survive to day three, pickup window | Beacon, reflector, or radio qualifies/improves pickup | Group rescue on successful pickup; storm/fallback on miss |

## Presentation

- The playfield shows the current project on the island (ridge smoke, a shore marker, or motorboat parts) without exposing hidden odds.
- The UI shows **Day N** and concise public project facts: `Beacon: lit`, `Shore marker: built`, `Radio: silent/contacted`.
- Consequence copy explains *why* a route was unlocked or weakened. Example: “The polished propeller blade now catches sunlight from the ridge.”
- `Decision 1 of 10` is not used for this system. Cards identify their current project and day instead.

## Balance targets

- A crew that keeps supplies stable and coordinates on a route should have a credible group escape path by day three.
- A crew that chases every project pays enough food/water/injury pressure to make that greed funny, not optimal.
- A motorboat solo escape remains the sharpest betrayal, but never becomes the only viable ending.
- With neutral rolls, each route should be individually viable; with cross-route preparation, plane/pickup success should become visibly safer rather than guaranteed unless radio contact was earned.
