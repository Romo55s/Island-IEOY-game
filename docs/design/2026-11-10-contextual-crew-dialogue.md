# Contextual crew dialogue — design V1

Status: refined plan, not implemented. Based on the owner's character descriptions and requirement that every exchange fit the story, decision, and actual outcome.

## Experience

The crew talks about the event the players are experiencing. Personality changes the delivery; public story facts determine what a character can claim. Randomness chooses among eligible authored conversations. A reply must respond to its preceding line. Reading the exchange must never contradict the report, reveal a private choice, or imply that a player voted for something they did not choose.

During a decision, characters can express concern, offer relevant expertise, or joke about the proposed task. They cannot know its result. After resolution, they react to the actual result, costs, injuries, and deaths. A humorous proposal is not an action: dialogue does not build a shelter, grant food, spend supplies, or alter a vote.

## What already exists

- `src/shared/content/characterProfiles.ts`: 15 profiles with calm/danger/success/hunger pools. Several descriptions conflict with the newly supplied personalities.
- `src/scene/crewHistoryDirector.ts`: deterministic social beats, including hunger, injury, rescue, mourning, and success. Rescue success is currently checked before deaths in the crash path; mixed results need coherent precedence. Relieved mourners currently receive `cheer`.
- `src/scene/sessionPresentation.ts`: picks generic profile lines, but `thoughtByBehavior` can replace them with identical generic thoughts. Text and animation selection are separate.
- `src/game/screens/StoryIncidentRoom.tsx`: presents a current line for every member, rather than an authored conversation with event history.
- `EventEntry` already records public resolution facts, resource/status changes, assignments, campaign facts, and boat facts. Public history is serialized in `src/shared/protocol.ts`; room migration is in `worker/game/roomStorage.ts`.
- The roster now contains 16 characters, including Courtney. His Mixamo-rigged model and 12 clips were admitted on 2026-11-12. Courtney's fishing expertise is a narrative/profile trait; mechanical bonuses remain separate balance work.

## Character voice guide

Names, identities, and strengths below come from the owner. Dialogue examples and temperament settings are proposed writing defaults. Sam maps to `cast-samantha`; use Samantha in existing identity fields. Esther's nickname is **Eagle Eye**. Do not replace stable character IDs.

| Character | Voice and contribution | Proposed stress / speaking tendency | Example with required context |
| --- | --- | --- | --- |
| Daniel | Analytical troubleshooter; isolates causes and explains the next step. Dry technical humor. | Usually composed; medium frequency. | After a failed engine repair: “We have reproduced the problem. Unfortunately, that was the easy part.” |
| Jim Young | Very sarcastic and funny; sharp commentary about the situation. | Usually composed; frequent jokes, restrained after a death. | After shelter completion: “Luxury accommodation. Finally, a hotel with fewer walls than excuses.” |
| Samantha / Sam | Makes lots of jokes; humor helps her cope with uncertainty. | Proposed higher nervousness; frequent speech. | Before a dangerous task: “I have a brave face ready. Please don't ask what the rest of me is doing.” |
| Tony | Brave, spontaneous, unpredictable ideas; eager to volunteer. | Low hesitation, high impulsiveness; medium frequency. | Before a risky task: “I volunteer. Can someone explain the plan while I reconsider the running start?” |
| Tim Corrigan | Team manager and great leader; gives direction and shares credit. | Usually composed; medium frequency, prominent when coordination is needed. | After a completed shelter: “Good work, everyone. Let's keep the next planning meeting under that roof.” |
| Esther Morgan | Eagle Eye; observant, kind, considerate. Notices useful details already established by the story. | Proposed higher nervousness; medium frequency. | After a supply cache is found: “Eagle Eye approves. Let's make sure everyone gets a share.” |
| Jacob Ramirez | Quiet, friendly; concise reassurance and occasional understated humor. | Usually composed; low frequency. | After shelter completion: “Looks good. I'll take the quiet corner.” |
| Michelle | Loves helping others; recurring Salesforce complaints. | Proposed higher nervousness; medium frequency. | During a repair discussion: “I'll help. If this needs a Salesforce ticket, we're sleeping here.” |
| Zach | Quiet; particularly interested in food. | Usually composed; low frequency, boosted for food situations. | Only after food is actually gained: “Excellent. Is the discussion part of dinner, or can we start?” |
| Richard Wang | Intelligent developer and leader; explains practical solutions clearly. | Usually composed; medium frequency, boosted for repair/coordination. | After repair failure: “Let's change one thing at a time. The engine already has enough surprises.” |
| Jessica Adlock | Understanding, empathetic, good at conversation and reassuring others. | Proposed higher nervousness; frequent supportive replies. | In danger: “It's okay to be worried. Tell us what you need, and we'll work through it together.” |
| Walter | Happy, jokes often, lifts the group's mood. | Usually composed; frequent speech. | After shelter completion: “Five stars for teamwork. I'll review the room service when we have some.” |
| Jorge | Loves metrics and helping people accomplish goals; progress-focused humor. | Usually composed; medium frequency. | After shelter completion: “Shelter milestone complete. I propose celebrating without creating another milestone.” |
| Maria | Supportive director; sees the team's needs and removes pressure. | Proposed moderate worry with steady outward leadership; medium frequency. | After an injury: “Take a breath. We'll make room for you to recover and work out the next step together.” |
| Steve | Calm, kind, helpful; reassuring and practical. | Low nervousness; medium-to-low frequency. | After a failed repair: “It's all right. We can look at what failed together.” |
| Courtney | Fishing expertise. Broader personality not supplied; use concise, practical fishing-related lines provisionally. | Neutral default; context-driven speech. | When discussing food near a publicly known fishing location: “If we have the gear, I can try fishing. Let's check what we've actually got.” |

Nervousness is an individual setting, not a runtime gender rule. The proposed settings reflect the owner's broad direction and can be edited without changing dialogue code. Nervous people remain competent, helpful, and capable of leadership. Quiet characters still speak when personally involved or their expertise matters. Do not infer additional personal flaws, dislikes, relationships, or incompetence from these descriptions.

Courtney's fishing is a narrative expertise tag in this feature. A success bonus or new fishing decision requires explicit rules and balance work in a separate feature. Never claim fish were caught without a recorded food/fishing outcome. Courtney is now admitted using his own rig and animations; do not retarget Daniel's rig to him.

## Team roles and workplace humor

The owner supplied this team context: Jessica and Walter are Product Owners; Jorge is the Scrum Master; Tim is the team manager. The remaining characters are Drupal web developers working with Acquia and other technologies. Preserve Maria's previously supplied director/supportive leadership identity alongside this technical background. These roles inform vocabulary and perspective, not authority over another player's choices or automatic survival bonuses.

| Character(s) | Role metadata | Writing emphasis |
| --- | --- | --- |
| Jessica Adlock | `product-owner` | Understanding needs, clarifying scope, explaining acceptance criteria kindly, helping people agree. |
| Walter | `product-owner` | Cheerful jokes about priorities, MVPs, backlog and feature requests; still supportive and competent. |
| Jorge | `scrum-master` | Sprint goals, blockers, retrospectives, progress and metrics; helps the team rather than treating people as numbers. |
| Tim Corrigan | `manager` | Team capacity, coordination, support, recognition and protecting people from unreasonable commitments. |
| Maria | `drupal-developer`, `director` | Technical background and supportive direction; scope tradeoffs and team wellbeing. |
| Daniel, Jim, Sam, Tony, Esther, Jacob, Michelle, Zach, Richard, Steve | `drupal-developer` | Drupal/Acquia development references in each character's established voice. Richard retains his technical leadership identity. |
| Courtney | `drupal-developer` | Same team background, with fishing as his distinct survival expertise. |

Use `teamRoles` as explicit profile metadata, separate from survival `expertise`, nervousness, and humor style. The shared vocabulary includes Drupal modules, content types, Views, configuration imports, cache rebuilds, Composer dependencies, Drush, deployment pipelines, Acquia environments, pull requests, merge conflicts, QA, sprint planning, refinement, estimates, acceptance criteria and retrospectives. Do not assign an unmentioned proprietary tool, product version, employer incident, client name, or real workplace grievance to the team. Michelle's Salesforce complaint is explicitly supplied and remains her occasional recurring motif.

Each joke must connect a concrete island problem to an appropriate workplace reference. Write the island observation first so the scene remains understandable; use the technical analogy as the punchline. Technology references are comparisons or imaginary proposals, not evidence that laptops, Wi-Fi, production access, or tools exist on the island. Do not make a technical joke imply a new story fact, an action already taken, or a real outage at Acquia or Salesforce.

Examples below are authored alternatives, not one conversation to play all at once. Require each named speaker to be present, and apply the existing seriousness/death gates.

**Shelter decision, before construction; Jessica and Jim:**

> Jessica: “Shelter first. Acceptance criteria: somewhere we can rest safely.”
> Jim: “Good. Let's keep the rooftop pool out of the first release.”

**After shelter completion; Walter and Jorge:**

> Walter: “The shelter is ready. Can we call this our minimum viable paradise?”
> Jorge: “Let's finish the survival sprint before we refine paradise.”

**After engine repair failure; Daniel and Jim:**

> Daniel: “The engine still won't start. Let's isolate the fault before changing anything else.”
> Jim: “An engine with no error log. Finally, a Drupal issue with fewer clues.”

**Before a risky task; Tony and Tim:**

> Tony: “I'll try it. Think of me as a hotfix with legs.”
> Tim: “Then let's review the hotfix before it runs toward the problem.”

**Before an uncertain task; Sam and Richard:**

> Sam: “Does this island have an Acquia staging environment? I'd like to panic there first.”
> Richard: “We can still review the risks before we commit to the plan.”

**When a repair is being discussed; Michelle and Jessica:**

> Michelle: “I'll help with the repair. Please tell me it doesn't need a Salesforce integration.”
> Jessica: “Just the repair. I'll keep the integrations out of scope.”

**After food is actually gained; Zach and Walter:**

> Zach: “Food acquired. I'd like to move lunch to In Progress.”
> Walter: “Finally, a backlog item everyone wants to pick up.”

**A generic setback without fresh casualty; Jacob and Steve:**

> Jacob: “That didn't work. Pair debugging?”
> Steve: “Of course. One problem at a time.”

**Food discussion at a known fishing location, Courtney admitted and present:**

> Courtney: “If we have fishing gear, I can try. No Composer install required.”
> Zach: “Can we keep lunch out of dependency hell too?”

**After a discovered supply cache; Esther and Maria:**

> Esther: “Eagle Eye spotted the supplies. No search module required.”
> Maria: “Nice find. Let's share them before we start optimizing the process.”

The last example requires Esther to be the publicly identified finder; otherwise use “Eagle Eye approves of those supplies” to avoid inventing credit. Maria's line proposes sharing, and must not be rewritten as a claim that sharing already happened unless recorded.

Use reusable motif IDs such as `drupal-cache`, `composer-dependencies`, `acquia-staging`, `deployment-hotfix`, `product-scope`, `scrum-sprint`, `scrum-metrics`, and `salesforce-integration`. Enforce the existing five-exchange motif cooldown across all speakers, including differently worded versions of the same joke. Give each character at least two work-related lines among their six initial lines, and keep at least one sincere supportive line. A fresh casualty or serious injury can suppress workplace humor entirely. Product Owners, managers, and Scrum Masters should contribute useful perspective, not become repetitive targets of developer complaints.

## Story truth and conversation structure

Each exchange has a trigger, topic, eligible speakers, ordered lines, and public fact requirements. Supported triggers: decision opened, result resolved, crash resolved, ending entered. Private-choice phases may use a generic waiting line only; there is no private-state inference.

Result precedence: fresh death/terminal loss; serious injury or danger; explicit story success/failure; needs pressure; generic reflection. Mixed outcomes retain multiple facts: a shelter can be completed while someone is injured. The lead exchange acknowledges the injury; a reply can acknowledge the shelter without celebrating the casualty. A small daily food cost must not relabel a successful repair as failure.

Use explicit outcome IDs and structured campaign/boat facts. Never classify a result by searching words in narrative text, image filenames, or a summed resource delta. “Freshwater found” does not necessarily mean a spring: the current rain catch also sets that flag. Spring-specific lines require `spring-found` or an equivalent explicit recorded fact. Likewise “shelter secured” does not prove reinforcement or a leaking roof.

An exchange is a small authored structure such as `acknowledge-result -> joke-about-result -> supportive-reply`. Each variant belongs to a compatible slot. Bind speaker roles once and use distinct characters. If a named speaker or prerequisite is unavailable, select another eligible complete exchange, shorten at a valid stopping point, or stay quiet. Do not assemble independently random remarks and label them a conversation.

Example, only after a successful repair with Daniel and Jim present and no fresh death:

> Daniel: “The engine runs. I'd call that a successful troubleshooting session.”
> Jim: “Good. I was worried we'd have to open a second troubleshooting island.”

Example, after repair failure with the same speakers:

> Daniel: “That repair didn't solve it. We need to check the next cause.”
> Jim: “Excellent. Even stranded, we have follow-up work.”

Example, after shelter completion with no injury/death and Tim, Walter, and Jorge present:

> Tim: “Good work, everyone. We have shelter.”
> Walter: “Do we get a ribbon-cutting ceremony?”
> Jorge: “Only if cutting the ribbon counts toward our next goal.”

These examples establish no new resources, actions, equipment, weather, or locations. In particular, remove the earlier suggestion to randomly claim the roof leaks: that requires an actual leaking-shelter result.

## Selection and pacing

- Produce one or two lines for decision opening, two for a normal result, and at most three for a supported reply sequence. One eligible speaker gets a monologue; zero gets no fabricated speaker.
- Only participating characters can speak. Ghosts may speak with explicit ghost presentation and awareness of their own death. At most one ghost line per exchange; all-ghost endings may use a short ghost exchange.
- Every living participant can still receive an emotion. Fresh death normally causes concern, fear, sadness, or relief at personal survival. Relief uses a subdued animation. Cheerful cruelty requires an explicitly authored context and trait; none is assumed from the supplied personalities.
- Select the actual assigned actor when the event publicly identifies them; otherwise select for relevance, expertise, temperament, and recent speaking frequency. Do not invent blame or announce a private vote.
- Exclude the same exchange template used in the last three exchanges and the same joke motif used in the last five. If this empties the set, choose a neutral factual acknowledgment or silence. Do not repeat a joke to fill space.
- Limit Salesforce jokes to one in the last five exchanges. Fishing and food comments are context-gated. Jim's sarcasm, Sam's nervous jokes, and Walter's cheerful jokes should have distinct wording and purpose.
- Use weighted deterministic selection seeded by room code, stable trigger ID, and dialogue content version. Sort eligible IDs before selection. Do not use wall time, render counts, array insertion order, or the gameplay RNG stream.
- Public facts are hard gates; weights cannot make an ineligible line possible. Prior story callbacks require the corresponding historical public fact, and current-tense claims must still be true.

## Multiplayer, persistence, and presentation

Choose the exchange once in shared game transition code, under server authority, and persist the selected text, line IDs, speakers, emotions, and semantic animation cues. The same result exchange is embedded in its `EventEntry`. A separate optional current prompt exchange supports predecision comments and is cleared when that decision ends. Both have stable trigger IDs so retries/reconnects cannot generate duplicates. Clients display the stored text, so content revisions cannot rewrite old conversations.

The selector receives an allowlisted public context. Omit hidden choices, pending outcomes, unrevealed actors, individual private votes, and private inventory. This also applies to speaker selection and animation cues: choosing the guilty character could leak information even without naming their action.

The crew radio shows ordered exchanges with local history scrolling. The report uses the same result exchange IDs/text, rather than generating a second conversation. Portrait emotion and animation come from each selected line. Resolve semantic cues using the speaker's own embedded animations; use their idle when unavailable. No rig sharing. Death plays once and the existing skull presentation remains.

Transitions can reveal lines with brief visual effects, but text is immediately accessible and decorative timing never blocks voting, timers, or server updates. Respect reduced motion. Reconnects restore text without replaying old audio or one-shot animations. Preserve existing player-message controls if encountered during integration; distinguish authored character speech from player-written messages.

Old saved events without exchanges remain readable and do not get invented dialogue computed from today's state. A neutral empty-radio state is acceptable. Retain the current bounded history policy for V1; preserve repetition memory separately as bounded template/motif ID lists if a future history limit is smaller than five exchanges.

## Scope and content coverage

First content delivery covers crash/rescue, shelter construction/reinforcement, freshwater, food shortages/finds, wildlife, medical care, route discovery, storms, radio/boat repair, failed signaling, successful rescue, private-choice aftermath when public, and all endings. Each existing decision/outcome must map to a supported topic or an explicit safe fallback; exact-outcome assertions stay gated.

Write at least two eligible exchange alternatives for each major success/failure context. Give each active character at least six distinct authored lines across three contexts, including one serious supportive line. Courtney is now admitted and has a character profile; add more exact fishing-specific exchanges based on playtest feedback. Include compatible two-person exchanges for Daniel/Jim, Tim/Walter, Michelle/Jessica, Jorge/Maria, and food-related Zach replies, with alternative cast arrangements. Do not require any fixed pair for a scene to work.

## Reference: Death Road to Canada

Confirmed design behavior: text events depend on party composition; the developer describes personalities/skills enabling different options and results, and low morale causing arguments or abandonment. [Developer interview, Kepa Auwae, March 7, 2018](https://www.psu.com/news/death-road-to-canada-interview/); [publisher description](https://noodlecake.com/games/death-road-to-canada/).

These sources do not disclose the internal dialogue selection algorithm. The event rules, conversation slots, seeded selection, cooldowns, and persisted exchanges above are our proposed implementation. Borrow the design principle of contextual character expression; write original island dialogue. Skill-based options and mechanical personality consequences can be designed later without making this first radio feature change survival balance.

## Acceptance

1. Dialogue references only established public facts; no future outcomes or hidden selfish decisions leak.
2. Replies fit their preceding lines, speaker personality, and event; two seeds may vary a conversation without changing its truth.
3. One event with the same public facts produces identical dialogue for every client, including reconnects.
4. Mixed success/injury/death cases match the report and appropriate portrait emotions.
5. Quiet characters get relevant moments; the full 16-character crew does not all speak at once.
6. The decision-test page exposes context, cast, selected exchange, rejected prerequisites, and reproducible seed controls for review.
7. Current game choices, resource effects, timer outcomes, and gameplay random draws remain identical with dialogue enabled.
