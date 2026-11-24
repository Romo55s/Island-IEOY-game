# Character Voices and Starting Items Implementation Plan

**Implementation status (2026-11-23):** Feature code is implemented locally. The detailed checklist below is the original planning record; actual file consolidation, executed checks, deviations and remaining human/multiplayer acceptance are recorded in the [master completion record](2026-11-12-team-feedback.md) and [QA report](../../qa/team-feedback.md). Unchecked original steps must not be interpreted as a claim that their exact procedure or broader acceptance was completed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Jim a contextual reckless voice, author Courtney's occasional stutter, and add eight objects to everyone's starting pool.

**Architecture:** Modify existing profiles and authored dialogue in place. Extend the actual selector in `src/shared/content/crewDialogue.ts`; the older plan's separate `src/shared/crewDialogue` directory does not exist in this checkout. Add explicit public context and exact speaker requirements without changing the gameplay RNG stream.

**Tech Stack:** TypeScript, existing React report/radio UI, Vitest.

**Spec:** `docs/design/2026-11-12-team-feedback-features.md`, sections 1 and 3.

## Global Constraints

Follow the spec's global constraints. New item `assetKey` values are null until an actual asset exists. No new statistical bonuses for personality or stuttering. All existing selector callers remain supported while the optional context is introduced.

### Task 1: Starting catalog

**Files:** Modify `src/shared/content/items.ts`; extend `tests/shared/items.test.ts`, `tests/shared/itemOffers.test.ts`, and `tests/shared/crashRescue.test.ts`.

**Interfaces:** Retain `SURVIVAL_ITEMS`, `SurvivalItemDefinition`, `drawStartingItemOffer`, and existing crash submission contracts. The catalog grows from 17 to 25 entries.

- [ ] Add the eight exact rows from spec section 3 with `assetKey: null`; retain schema validation and category fallbacks.
- [ ] Extend catalog tests with the precise new IDs, for example:

```ts
expect(SURVIVAL_ITEMS.find(item => item.id === "popcorn-basket"))
  .toMatchObject({ displayName: "Popcorn basket", category: "food", assetKey: null });
expect(SURVIVAL_ITEMS.find(item => item.id === "golf-club")?.displayName).toBe("Golf club");
```

- [ ] Extend deterministic draw fixtures to select items from the expanded tail of the pool and assert three distinct valid IDs. Exercise a new item in crash rescue, confirming existing default behavior and no undefined asset/effect.
- [ ] Run `npm run test -- tests/shared/items.test.ts tests/shared/itemOffers.test.ts tests/shared/crashRescue.test.ts`. Inspect crash item selection at narrow width for long names. Checkpoint only catalog and related tests.

### Task 2: Exact speaker and context eligibility

**Files:** Modify `src/shared/content/crewDialogue.ts`, `src/shared/rules/stateMachine.ts`, `src/game/screens/DecisionTestScreen.tsx`; extend `tests/shared/crewDialogue.test.ts`.

**Interfaces:** Export the following proposed types and helper from `crewDialogue.ts`; add an optional final context argument to both `selectDecisionPromptDialogue` and `selectResolvedCrewDialogue`:

```ts
export interface DialoguePublicContext {
  encounter: "bear" | "other";
  livingCharacterIds: readonly string[];
  itemIdsByCharacterId: Readonly<Record<string, readonly string[]>>;
}
export interface DialogueRequirements {
  requiredSpeakerIds?: readonly string[];
  requiredEncounter?: "bear";
  requiredOwnedItem?: { characterId: string; itemId: string };
}
export function dialogueRequirementsMet(
  requirements: DialogueRequirements,
  context: DialoguePublicContext,
): boolean;
```

- [ ] Add a focused eligibility test before implementation:

```ts
const context = {
  encounter: "bear" as const,
  livingCharacterIds: ["cast-jim-young", "cast-tony"],
  itemIdsByCharacterId: { "cast-tony": ["knife"] },
};
const requirements = {
  requiredSpeakerIds: ["cast-jim-young", "cast-tony"],
  requiredEncounter: "bear" as const,
  requiredOwnedItem: { characterId: "cast-tony", itemId: "knife" },
};
expect(dialogueRequirementsMet(requirements, context)).toBe(true);
expect(dialogueRequirementsMet(requirements, { ...context, livingCharacterIds: ["cast-tony"] })).toBe(false);
expect(dialogueRequirementsMet(requirements, { ...context, encounter: "other" })).toBe(false);
```

- [ ] Implement conjunctive requirements: every named speaker is alive, encounter matches, and the stated owner holds the named public item. Missing context rejects constrained templates. Required speakers bind to exact roles in the exchange; preferred IDs alone are insufficient.
- [ ] Supply context at server call sites from authoritative character state, exposing only inventory already public. Keep private fuel and future private choices out of context. Preserve existing generic fallbacks when named pairs are ineligible.
- [ ] Use persisted prior exchanges to prevent repeating an exact template within three result events. Persist an opening exchange once per decision rather than selecting on every snapshot/reconnect. Reuse existing deterministic dialogue hashing; no gameplay RNG draws.
- [ ] Run `npm run test -- tests/shared/crewDialogue.test.ts` and `npm run typecheck`. Check absent Jim, absent Tony, dead speaker, wrong tool owner, no tool, repeated event and unchanged result on reconnect. Checkpoint selector changes.

### Task 3: Authored voices and previews

**Files:** Modify `src/shared/content/characterProfiles.ts`, `src/shared/content/crewDialogue.ts`, `src/game/screens/DecisionTestScreen.tsx`; extend `tests/shared/characterProfiles.test.ts` and `tests/shared/crewDialogue.test.ts`.

**Interfaces:** Use Task 2 eligibility contracts; preserve `CharacterProfile` shape and existing dialogue emotion/animation enums.

- [ ] Change Jim's description to a sarcastic, inventive instigator and replace steady/safety-first flavor where it conflicts with that voice. Author two general lines each for exploration, repairs, and food; author four exact Jim/Tony exchanges (bow, knife, risky cave shortcut, overconfident repair), gated by the real decision and public tools. Bear templates remain dormant until package 2 supplies the bear context.
- [ ] Use the two spec examples verbatim as initial bear drafts. Keep generic injury/death support above instigator selection, preventing jokes from rewriting a fatal outcome as a success.
- [ ] Review all Courtney-specific profile/fallback text and author a light repetition/pause in roughly one third of lines. Preserve full understandable sentences, existing expertise, and normal odds; no global string transformation.
- [ ] Extend fixtures to assert Jim-specific lines never bind to another character and Courtney's lines retain the standard length limit. Test behavior rather than storing snapshots of every sentence.
- [ ] Run `npm run test -- tests/shared/characterProfiles.test.ts tests/shared/crewDialogue.test.ts`. Preview Jim/Tony together, each absent, and Courtney at narrow width. Record reviewed examples in `docs/qa/team-feedback.md`, then checkpoint the content changes.
