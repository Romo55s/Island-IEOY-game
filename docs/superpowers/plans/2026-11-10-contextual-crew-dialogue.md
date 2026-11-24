# Contextual Crew Dialogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Execution note: those workflow skills are not listed in the current skill catalog. If unavailable at execution, proceed inline with available repository tools and the task checkpoints below; do not block this feature on their installation.

**Goal:** Deliver coherent, personality-specific crew conversations grounded in public story facts, synchronized across multiplayer and previewable in `/decision-test`.

**Architecture:** A pure shared context builder and selector choose eligible authored exchanges once during authoritative game transitions. Persist result exchanges on existing events and the current predecision exchange on room state; clients render the saved conversations and each character's own animations. Personality affects delivery and speaker selection, while existing game rules determine all mechanical outcomes.

**Tech Stack:** Existing TypeScript, React, Zod, Cloudflare Durable Objects, Vitest, Playwright, and character portrait components; no new runtime dependency or external language-model service.

**Spec:** `docs/design/2026-11-10-contextual-crew-dialogue.md` (read before execution).

## Global Constraints

- All story assertions must be supported by public event/current/history facts. Private choices cannot affect public dialogue eligibility, speaker selection, or animations until revealed.
- Preserve story branches, voting, timers, outcome RNG, and resource effects.
- Maximum three lines per exchange; maximum 160 characters per rendered line.
- Persist selected text so reconnects and content updates do not reroll prior dialogue.
- Reuse the Black Box design system and the existing radio/report layout.
- Use only each character's own animation clips with an idle fallback.
- Preserve supplied team roles: Jessica/Walter are Product Owners, Jorge is Scrum Master, Tim is manager, and the others have Drupal/Acquia developer backgrounds; Maria also retains her director role. Workplace humor must remain grounded in island facts.
- The original dialogue implementation covered 15 active characters. Courtney was subsequently admitted as character 16 on 2026-11-12; his fishing expertise is descriptive and does not alter survival mechanics.
- This began as a planning deliverable. The implementation and validation record below was added after execution.

## File and interface map

Create `src/shared/crewDialogue/types.ts`: typed context, public facts, authored exchange and persisted exchange contracts.
Create `src/shared/crewDialogue/context.ts`: allowlisted public inputs and explicit outcome/topic mapping.
Create `src/shared/crewDialogue/select.ts`: eligibility, coherent role binding, cooldowns, deterministic weighting, and safe fallbacks.
Create `src/shared/content/crewDialogue.ts`: original dialogue templates, required facts, reply slots, motifs and speaker constraints.
Modify `src/shared/content/characterProfiles.ts`: replace draft personalities from the spec, add typed voice settings, preserve schema validation.
Modify `src/shared/domain.ts`, `src/shared/protocol.ts`, `worker/game/roomStorage.ts`: optional persisted/public exchanges and backward compatibility.
Modify `src/shared/rules/stateMachine.ts`: attach exchanges on transitions, including crash and private-route result paths.
Modify `src/scene/crewHistoryDirector.ts`, `src/scene/sessionPresentation.ts`: consume one dialogue/emotion authority and stop generic thoughts overriding chosen lines.
Modify `src/game/screens/StoryIncidentRoom.tsx`, its CSS module, `src/game/screens/GameSessionScreen.tsx`, `src/game/screens/DecisionTestScreen.tsx`, its CSS module: ordered radio/report conversations and preview controls.
Modify `src/scene/characters/CharacterModel.tsx` only as needed for semantic cues and per-character fallback behavior.

Proposed shared contract (define exports in `types.ts`; domain uses type-only imports):

```ts
type DialogueTrigger = 'decision-open' | 'resolution' | 'crash-resolution' | 'ending';
type DialogueEmotion = 'neutral' | 'happy' | 'sad' | 'afraid' | 'angry' | 'relieved';
type DialogueAnimation = 'idle' | 'concern' | 'agree' | 'laugh' | 'celebrate' | 'sad';
interface CrewDialogueLine {
  id: string;
  characterId: string;
  text: string;
  emotion: DialogueEmotion;
  animation: DialogueAnimation;
}
interface CrewExchange {
  id: string;
  trigger: DialogueTrigger;
  contentVersion: 1;
  templateId: string;
  motifIds: string[];
  lines: CrewDialogueLine[];
}
```

`ReactionContext` contains room code, stable trigger ID, trigger, exact decision/outcome IDs when public, topic, public fact keys, participating character IDs/status/resources, public actor/victim IDs, and prior exchanges. Use readonly arrays/objects. `deriveReactionContext(publicInput): ReactionContext` must never accept the complete private room state. `selectCrewExchange(context, profiles, templates): CrewExchange | null` must be pure. `selectCrewExchangeWithTrace` wraps the same evaluator for development-only eligibility reasons; no duplicate selector implementation.

Keep predecision storage as optional `activeCrewExchange?: CrewExchange` in private/public state. Keep result storage as optional `crewExchange?: CrewExchange` in `EventEntry`. Source context and selection trace are not broadcast. When a result and ending share a trigger, attach one exchange, not two.

## Task 1: Establish character voices and content rules

Files: modify `src/shared/content/characterProfiles.ts`; create `src/shared/crewDialogue/types.ts`; extend `tests/shared/characterProfiles.test.ts`.

- [ ] Add a validated `voice` object containing `humorStyle`, `nervousness`, `talkativeness`, and `expertise` tags. Use small enum values rather than prose parsing. Dialogue voice settings must not silently change gameplay stats.
- [ ] Add `teamRoles` as a nonempty unique array of `product-owner | scrum-master | manager | drupal-developer | director`. Populate it from the role table in the design spec. Keep it separate from survival expertise; a job title neither changes voting authority nor grants a skill bonus.
- [ ] Rewrite personality descriptions to match all 15 supplied identities. Keep strengths used by existing consumers valid; check all `strengths.includes(...)` readers before changing tags.
- [ ] Add the examples in the spec as context-bound content candidates, not generic fallback pools. Remove the stale comment that no coworker-specific jokes were supplied.
- [x] Admit Courtney only after confirming his own rigged model and animation clips. He is now character 16 in the catalog/profile; fishing is descriptive and adds no survival bonus.
- [ ] Test required voice fields, exactly one profile per active catalog character, Jim/Sam/Walter's distinct humor settings, and quiet Jacob/Zach settings. Run `npx vitest run tests/shared/characterProfiles.test.ts`.
- [ ] Include role validation: Jessica/Walter use Product Owner writing, Jorge uses Scrum Master writing, Tim uses manager writing, Maria retains director plus developer background. Unknown/duplicate role tags are rejected.
- [ ] Review and checkpoint only the files in this task; preserve unrelated working-tree changes.

## Task 2: Build the public context and explicit outcome mapping

Files: create `src/shared/crewDialogue/context.ts`; add `tests/shared/crewDialogueContext.test.ts`; read `src/shared/content/decisionCards.ts`, `campaignRoute.ts`, `motorboatRoute.ts`, and all event construction paths in `stateMachine.ts`.

- [ ] Inventory every authored decision and outcome, including assignment refusal, crash rescue, private fuel and launch aftermath, timeout fallback, and terminal outcomes. Record a topic or explicit neutral fallback for each. Use exact IDs and structured facts, never text matching.
- [ ] Build a small public context projection from allowlisted fields. The input must omit pending outcomes, individual private votes, hidden owners, private inventory and unrevealed actors. A private actor must not affect speaker weighting indirectly.
- [ ] Derive fresh deaths/injuries from this event's status/resource changes. Do not mistake a preexisting injury for an injury caused by the current decision. Resolve mixed-outcome priority as specified.
- [ ] Build distinct facts for spring versus rain collection, secured versus reinforced shelter, known versus reached cove, and prepared versus successful signal. A current fact and a historical fact are different conditions.
- [ ] Add counterfactual tests: same public state with different hidden choices gives equal context; `spring-found` allows spring text while `leaf-catch` does not; shelter success with injury retains both facts; decision-open context contains no future outcome; fresh death beats crash reunion celebration.
- [ ] Run `npx vitest run tests/shared/crewDialogueContext.test.ts` and checkpoint after reviewing outcome coverage.

## Task 3: Author compatible exchanges and deterministic selection

Files: create `src/shared/content/crewDialogue.ts`, `src/shared/crewDialogue/select.ts`, `tests/shared/crewDialogueSelection.test.ts`.

- [ ] Author major context alternatives and at least six lines across three contexts per active character, following the voice guide. Include serious support as well as jokes. Mark topic, prerequisites, role constraints, motif, emotion, and semantic animation on each candidate.
- [ ] Include at least two workplace-themed lines per active character and the linked example exchanges in the spec. Use Drupal, Acquia, Scrum and Product references according to role and personality; keep at least one sincere supportive line. Assign shared motif IDs so two different speakers cannot repeat the same cache, scope or Salesforce gag inside five exchanges.
- [ ] Define template slots with explicit valid predecessors: for example result acknowledgment -> reply to that acknowledgment. Variants must keep the same referent/topic. Named bindings must refer to eligible real participants; no unresolved placeholders.
- [ ] Evaluate public prerequisites first; bind distinct eligible speakers second; enforce last-three-template and last-five-motif exclusion third; weight by relevance and recent speaking frequency last. Exhausted pools fall back to a factual neutral line or silence.
- [ ] Use a stable hash with stable ID sorting and a seed derived from room/trigger/content version. Do not consume `cryptoRandom` or any RNG used by gameplay outcomes.
- [ ] Add meaningful selection fixtures: repeated same seed equals same exchange; reordered input arrays are equivalent; alternate seeds vary only eligible choices; absent actors invalidate a pair; one person receives a valid monologue; zero participants yields null; a quiet expert can speak; cooldown exhaustion does not repeat the joke; all lines have valid speakers and fit 160 characters after name substitution.
- [ ] Include a semantic fixture proving that two individually valid but incompatible lines cannot occupy the same exchange. Fixture example: a repair-success reply cannot follow a repair-failure opener.
- [ ] Add role/meaning fixtures: a Product Owner-specific slot requires that role; a metaphor about Acquia staging creates no equipment/location fact; a second differently worded `drupal-cache` joke is excluded within the motif cooldown; Esther cannot claim finder credit without the public actor fact.
- [ ] Run `npx vitest run tests/shared/crewDialogueSelection.test.ts tests/shared/crewDialogueContext.test.ts` and checkpoint the authored content with the selector.

## Task 4: Persist exchanges through authoritative transitions

Files: modify `src/shared/domain.ts`, `src/shared/protocol.ts`, `src/shared/rules/stateMachine.ts`, `worker/game/roomStorage.ts`; extend `tests/shared/protocol.test.ts`, add `tests/worker/crewDialogue.test.ts`.

- [ ] Add optional exchange fields, strict Zod schemas (unique line IDs, at most three lines, bounded text/IDs), and schema support for the current prompt exchange. The initial implementation has bumped the protocol from 5 to 6 because old strict clients cannot accept new event fields; keep pinned fixtures aligned.
- [ ] Use a stable trigger key based on transition/event identity, never `Date.now()` for selection. Attach a result exchange after its public outcome is known and before persistence. Generate prompt exchanges once when a decision opens and clear them on exit.
- [ ] Cover every event creation branch found in Task 2: normal resolution, crash, fuel share/hide, custodian group wake, solo success/failure, quiet miss, storm terminal, and signal/boat endings. Use one shared finalization helper, with idempotent handling when a trigger already has dialogue.
- [ ] Pass only the Task 2 public projection to the selector. Persist the returned text and IDs. A user-triggered command rejected by current rules must not create dialogue or reroll it.
- [ ] Preserve legacy saved rooms by treating absent optional exchanges as absent. Do not recompute old events using current resource state. Deduplicate history by exchange ID.
- [ ] Worker tests must compare two client snapshots, reconnect/load normalization, duplicate command/alarm handling, private-choice non-disclosure, timeout resolution, and unchanged outcome/resource results when dialogue is enabled. Count gameplay RNG calls to prove presentation randomness is independent.
- [ ] Run `npx vitest run tests/shared/protocol.test.ts` and `npx vitest run --config vitest.worker.config.ts tests/worker/crewDialogue.test.ts --max-workers=1 --no-isolate` before checkpointing.

## Task 5: Render coherent conversations and matching portraits

Files: modify `src/scene/crewHistoryDirector.ts`, `src/scene/sessionPresentation.ts`, `src/game/screens/StoryIncidentRoom.tsx`, `StoryIncidentRoom.module.css`, `GameSessionScreen.tsx`; extend `tests/scene/crewHistoryDirector.test.ts`, add `tests/client/crewDialogue.test.tsx`.

- [ ] Make stored exchanges the authority for spoken text. Remove generic `thoughtByBehavior` precedence over selected dialogue. Keep nonspeaking member emotions available for the manifest.
- [ ] Replace one-line-per-member radio rendering with current prompt plus historical result exchanges in chronological order. Use stable exchange/line IDs for keys and announcement deduplication. Preserve any existing player message behavior encountered during integration.
- [ ] Have report dialogue reuse the latest event's actual exchange. Remove `members.slice(0, 2)` as the report speaker-selection rule.
- [ ] Resolve semantic animations using the speaker's own clips: concern -> afraid/scared/idle; agree -> agree/idle; laugh -> own laugh/clap/idle; celebrate -> own cheer/clap/agree/idle; sad -> cry/depressed/idle. Relieved after a death uses idle or agree, never cheer. Preserve one-shot death/skull handling.
- [ ] Keep local radio scrolling, fixed desktop shell, mobile radio access, readable focus order, reduced motion, and existing metal/pixel styling. Preserve scroll position when reading history; show new-message access rather than forcibly jumping to the newest line.
- [ ] Test report/radio text equality, three-line cap, no duplicate live announcements, ghost skulls, missing animation fallback, and no cheering for ordinary relief at a fresh death. Run `npx vitest run tests/client/crewDialogue.test.tsx tests/scene/crewHistoryDirector.test.ts` and checkpoint.

## Task 6: Expose reproducible authoring scenarios in decision-test

Files: modify `src/game/screens/DecisionTestScreen.tsx` and its CSS module; create `e2e/crew-dialogue.spec.ts`.

- [ ] Generate previews through the same context/selector APIs used by transitions. Let the existing decision and outcome controls provide real facts; do not derive truth from the selected image override.
- [ ] Add preview trigger (before decision/after result), seed, and cast membership selection. Preserve full-roster capacity derived from `MAX_PLAYER_COUNT`. Provide a development-only disclosure panel showing topic, established facts, template ID, and rejected prerequisite reasons.
- [ ] Add a reroll control that changes only the dialogue preview seed. It must not change outcome, resources, or game RNG. Offer scenarios for shelter success/failure, repair success/failure, spring/rainwater, hunger, fresh death, mixed injury/success, ghost banter, and private-result redaction.
- [ ] In Playwright verify coherent two-person replies, screenshot full-roster radio with only a few speakers, report/radio consistency, and mobile overflow. Test a real two-client session plus reconnect for identical exchange IDs/text; the local preview is not proof of multiplayer synchronization.
- [ ] Run `npx playwright test e2e/crew-dialogue.spec.ts`. Save screenshots and elapsed time under a dedicated `output/qa/crew-dialogue/` directory and record actual results in `docs/qa/crew-dialogue.md`.

## Task 7: Review story coverage and complete handoff

- [ ] Review all outcome/topic mappings for false assertions, including existing campaign coherence audit cases: reinforced shelter, spring discovery, ridge position, and successful rescue combined with resource depletion.
- [ ] Read every exchange as a conversation, including its eligible variants. Have the user review samples for character authenticity; this review may tune prose, but implementation does not require a new permission step.
- [ ] Review workplace humor for distinct voices, relevant island setup, role accuracy, shared motif cooldowns, and sincere support. Check that no dialogue assumes real laptops, network access, client incidents or tools on the island, and that no joke claims new supplies/actions.
- [ ] Run `npm run typecheck` and the focused tests from Tasks 1–5. Run existing campaign/assignment/private-choice regressions touched by implementation. Record any preexisting unrelated failures separately and do not claim full suite success.
- [ ] Confirm that the user-visible story map/mechanics description still accurately describes reactions; update its dialogue explanation if required without adding gameplay branches.
- [ ] Mark completed tasks, link the QA evidence, and list any remaining content gaps. Courtney's roster admission is complete; a mechanical fishing ability remains separate explicit followup work.

## Review record

Plan covers the 15 originally active profiles; Courtney has since been admitted as the sixteenth playable character with a fishing-oriented profile and his own model animations. The Death Road to Canada comparison is supported by developer/publisher sources in the design document; implementation details are our design, not a claimed reconstruction of that game's code.

## Implementation and validation record — 2026-11-10

The first implementation slice is complete in the existing shared game modules. It uses typed `EventEntry` and snapshot fields rather than adding parallel context state. Result exchanges are selected from exact outcome IDs and fresh recorded status/resource changes, saved on the event, and reused by the report and radio. Decision-opening lines are selected before voting. Private-choice selectors do not read the hidden actor or pending response. Deterministic selection uses stable IDs and profile talkativeness weights, with recent-speaker, template, and tagged workplace-motif suppression. The selector does not call the gameplay random source.

At the time of the initial dialogue implementation, role/voice metadata and authored fallback voices covered all 15 active profiles. Courtney has since been added as the sixteenth catalog/profile entry. Exact exchanges cover shelter construction and setbacks, platform improvement, spring and rain-catch water, food outcomes, repair, wildlife, medical care, route discovery, and signal success/failure. Repair and council outcomes have role-specific paired dialogue when the relevant characters are present. Other outcomes receive restrained, personality-specific lines; death and injury fallbacks stay sincere. `/decision-test` previews opening/result exchanges, cast size, dialogue-only seed changes, public context, and selector fallback reasons. The radio keeps the latest exchange visually prominent and up to five prior result exchanges in its own scrollable history.

Validation completed:

- `npm run typecheck` and `git diff --check` passed.
- Shared, client, profile, protocol, scene, and dialogue focused tests passed: 50 tests.
- Worker gameplay, assignment, lobby, motorboat, and crash-rescue focused tests passed: 35 tests.
- The final full Worker suite passed: 50 tests. A deterministic integration test follows the failed-signal path through coastal choices to the boat and storm-recovery decision.
- Decision-test Playwright passed with all 15 characters; changing the dialogue seed preserved the selected outcome and resources, and mobile radio access had no horizontal overflow.
- Three-client Playwright passed: radio/report text matched across clients and after reload.
- Full two-client campaign Playwright passed a 15-decision signal-rescue route in 7.1 minutes.
- Screenshots and run details are in `docs/qa/crew-dialogue.md` and `output/qa/crew-dialogue/`.

The failed-signal-to-motorboat route now has deterministic Worker integration coverage, but was not driven through a complete browser campaign in this pass. The complete unit/client suite has 7 failing tests across 8 files; details are in `docs/qa/crew-dialogue.md`. Courtney is now in the active roster; no fishing success bonus or new fishing decision has been added. Further exact dialogue variants can be authored from playtest feedback without changing this persistence/selection architecture.

### Final plan status

The implementation uses the project's existing shared content/rules modules instead of the proposed new `src/shared/crewDialogue/` context and selector modules. This keeps context derivation next to the outcome rules that own the facts and puts the authored templates beside shared content. Coverage was adapted to the real event model: exact authored exchanges handle high-value outcomes, while typed, per-character fallback voices cover other public outcomes. The focused suite and browser evidence above are the completion record for this adapted implementation.

Remaining validation/content work is explicit: run a complete browser campaign through failed signal into the motorboat branch, resolve the broader suite failures, and review the authored lines with the user for voice authenticity. More bespoke dialogue can then be added where playtesting identifies repetitive fallbacks. No gameplay branch, survival mechanic, or Courtney roster admission is part of this feature.
