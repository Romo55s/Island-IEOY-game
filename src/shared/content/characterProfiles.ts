import { z } from "zod";

import { CHARACTER_CATALOG } from "../domain";

export const CharacterProfileSchema = z.object({
  characterId: z.string().min(1).max(64),
  personality: z.string().min(1).max(120),
  strengths: z.array(z.string().min(1).max(48)).min(1).max(3),
  flaws: z.array(z.string().min(1).max(48)).min(1).max(3),
  idleTags: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).max(6),
  reactions: z.object({
    calm: z.array(z.string().min(1).max(160)).min(1).max(4),
    danger: z.array(z.string().min(1).max(160)).min(1).max(4),
    success: z.array(z.string().min(1).max(160)).min(1).max(4),
    hunger: z.array(z.string().min(1).max(160)).min(1).max(4),
  }).strict(),
}).strict();

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

/** Draft, affectionate workplace-survival profiles. No coworker-specific jokes were supplied. */
export const CHARACTER_PROFILES: CharacterProfile[] = [
  { characterId: "cast-daniel", personality: "Confident problem-solver who likes having a plan.", strengths: ["decisive", "resourceful"], flaws: ["overcommits"], idleTags: ["confident", "observant"], reactions: { calm: ["I have a plan. The plan is currently loading.", "I made a checklist. It has a tab called unexpected island."], danger: ["Everyone stay calm. I am testing that theory.", "The plan has changed. The new plan is to remain upright."], success: ["As expected. I will now act surprised.", "Let's call that intentional and keep moving."], hunger: ["I am not proposing cannibalism. I am proposing we discuss every option, very calmly.", "Before anyone becomes a menu item, let's find food."] } },
  { characterId: "cast-samantha", personality: "Practical and observant, with a knack for noticing the useful detail.", strengths: ["observant", "prepared"], flaws: ["overthinks"], idleTags: ["practical", "focused"], reactions: { calm: ["I packed for this. Not this specifically, but close.", "I labeled the supplies. The labels are holding up better than we are."], danger: ["I noticed that a little earlier than everyone else.", "That sound is new. I would prefer it to stay that way."], success: ["Good. I had quietly prepared for that.", "Useful outcome. I will try not to look too pleased."], hunger: ["I checked the supplies twice. We have no food, and absolutely no permission to eat each other.", "Let's forage or fish before this conversation gets worse."] } },
  { characterId: "cast-jim-young", personality: "Steady under pressure and willing to improvise.", strengths: ["steady", "inventive"], flaws: ["stubborn"], idleTags: ["steady", "curious"], reactions: { calm: ["This is manageable, pending a second opinion.", "I can improvise. I reserve the right to call it a plan afterward."], danger: ["I am remaining calm with considerable effort.", "Let's handle the immediate problem before naming it."], success: ["That was almost exactly the plan.", "Good result. I will take no follow-up questions about the method."], hunger: ["We could eat each other, but I am willing to try fishing first.", "I vote we make a fish trap before anybody starts making suggestions about people."] } },
  { characterId: "cast-esther-morgan", personality: "A thoughtful organizer who tries to keep the group pointed in one direction.", strengths: ["organized", "empathetic"], flaws: ["takes-on-too-much"], idleTags: ["thoughtful", "attentive"], reactions: { calm: ["I made a list. The list has questions.", "I have assigned the list a backup list."], danger: ["Let's keep this orderly, even if the island won't.", "Everyone take one step back. I am adding that to the minutes."], success: ["Excellent. I will update the list accordingly.", "That worked. I have recorded who is allowed to say 'I told you so.'"], hunger: ["I am adding 'do not eat the committee' to the minutes. Now, food search assignments.", "No eating people. I have organized a perfectly normal search for fruit and fish."] } },
  { characterId: "cast-tim", personality: "An adaptable optimist who can find a bright side in questionable circumstances.", strengths: ["adaptable", "optimistic"], flaws: ["underestimates-risk"], idleTags: ["relaxed", "upbeat"], reactions: { calm: ["Could be worse. I am not specifying how.", "On the bright side, we have identified a new thing to worry about."], danger: ["I remain optimistic, but at a lower volume.", "I have downgraded this from 'fine' to 'probably manageable.'"], success: ["See? The situation was only mostly alarming.", "We should celebrate quietly, in case the island is listening."], hunger: ["Could be worse. We could be considering eating each other. Let's not.", "I'm optimistic we can find coconuts before this gets weird."] } },
  { characterId: "cast-tony", personality: "A bold improviser who is quick to volunteer for the next questionable task.", strengths: ["bold", "helpful"], flaws: ["acts-too-fast"], idleTags: ["bold", "restless"], reactions: { calm: ["I can help. I have not checked how yet.", "I volunteer to inspect it from a safe, nearby distance."], danger: ["I meant to do that, in a different version of events.", "That was a controlled mistake. Mostly controlled."], success: ["Everyone is safe. I am counting that as a win.", "It worked. I will now pretend I expected that."], hunger: ["I volunteer to find food. To be clear, I am not volunteering as food.", "We could eat each other, but I can probably find a coconut first."] } },
  { characterId: "cast-michelle", personality: "A calm mediator who tries to keep small problems from becoming group projects.", strengths: ["calm", "diplomatic"], flaws: ["avoids-confrontation"], idleTags: ["calm", "supportive"], reactions: { calm: ["Let's take a breath before naming a committee.", "We can solve this without creating a subcommittee. Probably."], danger: ["We can discuss blame after we leave the danger.", "Let's focus on getting everyone through the next minute."], success: ["Nice work. Nobody needs to schedule a follow-up.", "Good teamwork. I will not turn it into a recurring meeting."], hunger: ["Let's keep this theoretical and make a food-search plan together.", "No one is on the menu. Let's solve the actual problem as a team."] } },
  { characterId: "cast-jacob-ramirez", personality: "A curious tinkerer who sees potential in objects other people have already discarded.", strengths: ["curious", "handy"], flaws: ["gets-distracted"], idleTags: ["curious", "inventive"], reactions: { calm: ["This might be useful. I have not established how.", "I found three uses for that object. Two are probably safe."], danger: ["I was inspecting the mechanism, not starting it.", "That was not supposed to make that noise yet."], success: ["It works. I will avoid explaining the prototype.", "The prototype is now a product. Please do not ask about version two."], hunger: ["I can build a fish trap. Please do not build a people trap.", "We could eat each other, but I have a very promising coconut-cracking prototype."] } },
  { characterId: "cast-zach", personality: "A quick-thinking joker who uses humor to keep the group moving.", strengths: ["witty", "quick-thinking"], flaws: ["deflects-with-humor"], idleTags: ["playful", "alert"], reactions: { calm: ["At least the island has no meeting invite system.", "I checked the calendar. The island has declined to share one."], danger: ["This is not the worst team-building exercise. Yet.", "I would like to unsubscribe from this particular team-building exercise."], success: ["Great, we survived the agenda item.", "Excellent. I have prepared a tasteful amount of confidence."], hunger: ["I would like to formally withdraw myself from the menu.", "Cannibalism: a terrible plan, and I say that as the current special."] } },
];

export function validateCharacterProfiles(profiles: readonly CharacterProfile[]): void {
  const catalogIds = new Set(CHARACTER_CATALOG.map(({ id }) => id));
  const profileIds = new Set<string>();
  for (const profile of profiles) {
    CharacterProfileSchema.parse(profile);
    if (!catalogIds.has(profile.characterId)) throw new Error(`Unknown character profile: ${profile.characterId}`);
    if (profileIds.has(profile.characterId)) throw new Error(`Duplicate character profile: ${profile.characterId}`);
    profileIds.add(profile.characterId);
  }
  for (const id of catalogIds) if (!profileIds.has(id)) throw new Error(`Missing character profile: ${id}`);
}

validateCharacterProfiles(CHARACTER_PROFILES);
