# Friend Playtest Feedback — 2026-11-23

## Reported problems

- Players want clearer letter/number labels in the interface. The exact placement is awaiting clarification; likely candidates are health values and choice shortcuts.
- Health decreases need a visible cause, such as hunger or a specific resolved decision.
- The history should retain those changes so players can understand the chain of events.
- The health indicators in the left passenger manifest sometimes disagree with the character's actual health.
- Some clients appear frozen and require a page reload before play resumes.
- Scene images and character models should load faster and be cached appropriately.
- Some incident reports omit the outcome. The bear encounter, for example, must explain whether the crew fought successfully, retreated, or suffered injury.

## Player-facing behavior to preserve

- The server snapshot remains authoritative for character resources and status.
- Every displayed health change should trace to an authored event or survival tick, including its cause and before/after values.
- The report and radio history should describe the same committed outcome.
- Connection loss should show a recoverable state and restore the latest server snapshot when reconnecting; players should not need a reload for ordinary transient disconnects.
- Cache policies should speed repeat visits without making HTML or mutable model paths stay stale after a release.

## Success criteria

- Passenger health indicators match the latest authoritative snapshot after every event.
- A health loss includes an understandable cause and appears in the event history.
- Bear reports describe the actual result, not just the decision prompt.
- A disconnected client visibly recovers or reaches an actionable failed state; it does not silently freeze.
- Repeated loads reuse cached images and models while new deployments can update them.

## Open question

The phrase “letras, números” needs a UI-specific answer: numeric health values, letter/number labels on decision options, or both.
