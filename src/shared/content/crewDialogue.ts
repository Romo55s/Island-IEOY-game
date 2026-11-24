import { selectInstigatorPrompt, type DialoguePublicContext } from "./instigatorDialogue";
export { dialogueRequirementsMet, type DialogueRequirements, type DialoguePublicContext } from "./instigatorDialogue";
import type { CrewDialogueExchange, CrewDialogueLine, EventEntry } from "../domain";
import { CHARACTER_PROFILES, type CharacterProfile } from "./characterProfiles";

interface DialogueTemplate {
  id: string;
  outcomeIds: readonly string[];
  motifIds?: readonly string[];
  firstRole: CharacterProfile["teamRoles"][number];
  secondRole: CharacterProfile["teamRoles"][number];
  firstExpertise?: CharacterProfile["voice"]["expertise"][number];
  firstPreferredIds?: readonly string[];
  secondPreferredIds?: readonly string[];
  thirdRole?: CharacterProfile["teamRoles"][number];
  first: readonly { text: string; emotion: CrewDialogueLine["emotion"]; animation: CrewDialogueLine["animation"] }[];
  second: readonly { text: string; emotion: CrewDialogueLine["emotion"]; animation: CrewDialogueLine["animation"] }[];
  third?: readonly { text: string; emotion: CrewDialogueLine["emotion"]; animation: CrewDialogueLine["animation"] }[];
}

const templates: readonly DialogueTemplate[] = [
  {
    id: "loss-support-v1", outcomeIds: [], firstRole: "manager", secondRole: "product-owner",
    first: [{ text: "We lost someone. Take a moment; we will decide the next step together.", emotion: "sad", animation: "sad" }, { text: "Let's stay close and look after one another for a minute.", emotion: "sad", animation: "sad" }],
    second: [{ text: "There's no need to rush past this. I'm here if anyone needs to talk.", emotion: "sad", animation: "sad" }, { text: "We can make the next decision when everyone is ready.", emotion: "sad", animation: "sad" }],
  },
  {
    id: "hunger-betrayal-reconsidered-v1", outcomeIds: ["group-backed-down", "night-regretted"],
    firstRole: "drupal-developer", secondRole: "drupal-developer",
    first: [{ text: "The attempt failed. Being hungry doesn't make that easy to forget.", emotion: "afraid", animation: "concern" }],
    second: [{ text: "Nobody got food out of this. We need a plan we can live with.", emotion: "neutral", animation: "agree" }],
  },
  {
    id: "hunger-target-escaped-v1", outcomeIds: ["target-fought-free"],
    firstRole: "drupal-developer", secondRole: "drupal-developer",
    first: [{ text: "They got away. We almost lost someone to our own crew.", emotion: "afraid", animation: "concern" }],
    second: [{ text: "We still need food. Let's search without turning on anyone else.", emotion: "neutral", animation: "agree" }],
  },
  {
    id: "shelter-setback-pair-debug-v1", outcomeIds: ["muddy-platform", "supplies-kept"],
    firstRole: "drupal-developer", secondRole: "manager",
    first: [{ text: "That didn't give us the shelter improvement we wanted. Let's see what can still be salvaged.", emotion: "neutral", animation: "concern" }, { text: "The platform sank. We should check the ground before trying another build.", emotion: "neutral", animation: "agree" }],
    second: [{ text: "Agreed. We'll adjust the plan to what the site can support.", emotion: "neutral", animation: "agree" }, { text: "Let's look after everyone first, then decide what is still useful.", emotion: "relieved", animation: "agree" }],
  },
  {
    id: "shelter-ready-product-scope-v1", outcomeIds: ["cover-secured", "shelter-braced", "rope-anchors"], motifIds: ["product-scope", "scrum-sprint"],
    firstRole: "manager", secondRole: "product-owner",
    firstPreferredIds: ["cast-tim"], secondPreferredIds: ["cast-jessica-adlock", "cast-walter"], thirdRole: "scrum-master",
    first: [{ text: "Good work, everyone. We have shelter.", emotion: "relieved", animation: "agree" }, { text: "The shelter is ready. Thanks for getting this done together.", emotion: "happy", animation: "celebrate" }],
    second: [{ text: "Great. Let's keep the rooftop pool out of the first release.", emotion: "happy", animation: "laugh" }, { text: "The MVP is a dry place to sleep. I think we can ship that.", emotion: "relieved", animation: "agree" }],
    third: [{ text: "Shelter goal complete. Let's not add a second sprint for interior design.", emotion: "happy", animation: "laugh" }, { text: "The shelter is done. That's one clear goal off the board.", emotion: "relieved", animation: "agree" }],
  },
  {
    id: "sleeping-platform-raised-v1", outcomeIds: ["raised-sleeping-area"], firstRole: "drupal-developer", secondRole: "manager",
    first: [{ text: "The sleeping platform is raised above the runoff. That should make this spot drier.", emotion: "relieved", animation: "agree" }, { text: "The platform is up. That's a useful improvement for tonight.", emotion: "happy", animation: "agree" }],
    second: [{ text: "Good work. We'll keep improving the shelter as supplies allow.", emotion: "relieved", animation: "agree" }, { text: "That gives the crew a drier sleeping area. Let's check the next need.", emotion: "happy", animation: "agree" }],
  },
  {
    id: "food-setback-prioritize-v1", outcomeIds: ["spoiled-fruit-morning", "foraging-setback", "boar-distracted", "careful-retreat"],
    firstRole: "drupal-developer", secondRole: "product-owner",
    firstPreferredIds: ["cast-zach"], secondPreferredIds: ["cast-walter", "cast-jessica-adlock"],
    first: [{ text: "That search came up short. We need another food plan.", emotion: "neutral", animation: "concern" }, { text: "Not much to eat from that attempt. Let's check what the crew still has.", emotion: "neutral", animation: "agree" }],
    second: [{ text: "Let's put food back at the top of the list and choose a plan together.", emotion: "neutral", animation: "agree" }, { text: "Understood. We'll keep the next step practical and make sure everyone is included.", emotion: "relieved", animation: "agree" }],
  },
  {
    id: "wildlife-response-v1", outcomeIds: ["boar-driven-off", "boar-charge", "boar-charged", "cave-rockfall"],
    firstRole: "drupal-developer", secondRole: "manager",
    first: [{ text: "Let's give it room and check that nobody needs help.", emotion: "afraid", animation: "concern" }, { text: "That got dangerous quickly. We should regroup before moving.", emotion: "afraid", animation: "concern" }],
    second: [{ text: "Stay together. We can sort out supplies after everyone's safe.", emotion: "neutral", animation: "agree" }, { text: "I'll check on the crew. No one needs to handle this alone.", emotion: "relieved", animation: "agree" }],
  },
  {
    id: "medical-care-team-v1", outcomeIds: ["wounds-cleaned", "rested-injured", "radio-parts-recovered"],
    firstRole: "drupal-developer", secondRole: "director",
    first: [{ text: "Let's keep the injured person comfortable and check what supplies remain.", emotion: "neutral", animation: "agree" }, { text: "The immediate care is done. We should keep an eye on how they're feeling.", emotion: "relieved", animation: "agree" }],
    second: [{ text: "We'll make space for recovery and decide the next step as a crew.", emotion: "relieved", animation: "agree" }, { text: "Take the time you need. We'll share the work while you rest.", emotion: "happy", animation: "agree" }],
  },
  {
    id: "route-discovery-map-v1", outcomeIds: ["cove-located", "lookout-returned", "ridge-position", "low-path-position", "safe-coast-route", "scout-found-repair-parts"],
    firstRole: "drupal-developer", secondRole: "scrum-master",
    firstPreferredIds: ["cast-esther-morgan"], secondPreferredIds: ["cast-jorge"],
    first: [{ text: "Let's mark what we actually found so the crew can follow it safely.", emotion: "happy", animation: "agree" }, { text: "I'll make a clear note of the route we reached, so nobody has to guess later.", emotion: "relieved", animation: "agree" }],
    second: [{ text: "Route milestone recorded. Let's make sure the whole crew knows the next step.", emotion: "happy", animation: "agree" }, { text: "Good progress. We'll keep the plan tied to the route we confirmed.", emotion: "relieved", animation: "agree" }],
  },
  {
    id: "signal-success-crew-v1", outcomeIds: ["radio-burst-success", "fire-flare-success", "smoke-beacon-success"],
    firstRole: "manager", secondRole: "product-owner",
    firstPreferredIds: ["cast-tim"], secondPreferredIds: ["cast-walter", "cast-jessica-adlock"],
    first: [{ text: "They saw the signal. Stay together while we wait for the response.", emotion: "relieved", animation: "agree" }, { text: "We made contact. Let's keep everyone safe until help reaches us.", emotion: "happy", animation: "celebrate" }],
    second: [{ text: "That's the outcome we hoped for. Let's keep the crew together.", emotion: "relieved", animation: "agree" }, { text: "A real response. I'll save the celebration for when we're aboard.", emotion: "happy", animation: "agree" }],
  },
  {
    id: "signal-failure-next-step-v1", outcomeIds: ["radio-burst-failure", "fire-flare-failure", "smoke-beacon-failure"],
    firstRole: "drupal-developer", secondRole: "manager",
    first: [{ text: "No response came through. Let's use the other lead we still have.", emotion: "neutral", animation: "concern" }, { text: "The signal missed them. We should regroup and check our remaining options.", emotion: "neutral", animation: "agree" }],
    second: [{ text: "We'll take a moment, then choose the next step together.", emotion: "relieved", animation: "agree" }, { text: "The attempt is over. Let's keep the crew focused on what we can still do.", emotion: "neutral", animation: "agree" }],
  },
  {
    id: "boat-discovery-assess-v1", outcomeIds: ["hull-saved", "engine-diagnosed", "parts-salvaged", "scout-found-repair-parts"],
    firstRole: "drupal-developer", secondRole: "manager",
    firstPreferredIds: ["cast-daniel", "cast-richard-wang"], secondPreferredIds: ["cast-tim"],
    first: [{ text: "We know a little more about the boat now. Let's work from what the inspection confirmed.", emotion: "neutral", animation: "agree" }, { text: "Let's inventory the useful parts before deciding on a repair.", emotion: "neutral", animation: "agree" }],
    second: [{ text: "Good. We'll make a repair plan around the parts we actually have.", emotion: "relieved", animation: "agree" }, { text: "Let's keep the crew clear of the tide while we sort the next step.", emotion: "neutral", animation: "agree" }],
  },
  {
    id: "repair-failure-michelle-jessica-v1", outcomeIds: ["radio-repair-failed"], motifIds: ["salesforce-integration"],
    firstRole: "drupal-developer", secondRole: "product-owner",
    firstPreferredIds: ["cast-michelle"], secondPreferredIds: ["cast-jessica-adlock"],
    first: [{ text: "The radio repair failed. I'll help with another approach, as long as it doesn't need a Salesforce ticket.", emotion: "neutral", animation: "agree" }, { text: "No signal from that repair. I'll pitch in on the next plan; no Salesforce integration, please.", emotion: "neutral", animation: "concern" }],
    second: [{ text: "No Salesforce integration. Let's talk through the options we actually have.", emotion: "relieved", animation: "agree" }, { text: "We'll take another look together and keep the next step in scope.", emotion: "neutral", animation: "agree" }],
  },
  {
    id: "repair-failed-debug-v1", outcomeIds: ["radio-repair-failed"], motifIds: ["drupal-debug"],
    firstRole: "drupal-developer", secondRole: "drupal-developer",
    firstPreferredIds: ["cast-daniel"], secondPreferredIds: ["cast-jim-young"],
    first: [{ text: "That repair didn't solve it. Let's check the next cause.", emotion: "neutral", animation: "concern" }, { text: "It still won't run. We should change one thing at a time.", emotion: "neutral", animation: "agree" }],
    second: [{ text: "An engine with no error log. A Drupal issue with fewer clues.", emotion: "neutral", animation: "laugh" }, { text: "At least this bug can't ask us to clear the cache again.", emotion: "neutral", animation: "laugh" }],
  },
  {
    id: "repair-success-hotfix-v1", outcomeIds: ["radio-repaired", "careful-sturdy", "force-sturdy", "braces-sturdy", "careful-fragile", "force-fragile", "braces-fragile", "motorboat-emergency-pull-start"], motifIds: ["deployment-hotfix"],
    firstRole: "drupal-developer", secondRole: "manager",
    firstExpertise: "troubleshooting",
    first: [{ text: "It runs. I'd call that a successful troubleshooting session.", emotion: "relieved", animation: "agree" }, { text: "Repair complete. I recommend we stop changing things while it works.", emotion: "happy", animation: "agree" }],
    second: [{ text: "Good. Let's get everyone clear before we call it shipped.", emotion: "relieved", animation: "agree" }, { text: "Nice work. We'll count the hotfix after we've checked that it's safe.", emotion: "happy", animation: "celebrate" }],
  },
  {
    id: "spring-found-esther-eagle-eye-v1", outcomeIds: ["spring-found"],
    firstRole: "drupal-developer", secondRole: "director",
    first: [{ text: "Water secured. Let's mark the route so we can find it again.", emotion: "happy", animation: "agree" }, { text: "We found water. I'll mark the route so we can find it again.", emotion: "relieved", animation: "agree" }],
    second: [{ text: "Nice find. Let's share it and check what everyone needs.", emotion: "relieved", animation: "agree" }, { text: "Good work. We'll make sure the crew gets a fair share.", emotion: "happy", animation: "celebrate" }],
  },
  {
    id: "rain-catch-water-v1", outcomeIds: ["leaf-catch"], firstRole: "drupal-developer", secondRole: "director",
    firstPreferredIds: ["cast-esther-morgan"], secondPreferredIds: ["cast-maria"],
    first: [{ text: "The leaf catch brought in some water. Let's protect what we collected.", emotion: "relieved", animation: "agree" }, { text: "We have a little water from the rain catch. Let's keep it with the supplies.", emotion: "happy", animation: "agree" }],
    second: [{ text: "Good. We'll account for it and share it with the crew.", emotion: "relieved", animation: "agree" }, { text: "Every safe drink helps. Let's check what everyone needs.", emotion: "happy", animation: "agree" }],
  },
  {
    id: "food-found-zach-walter-v1", outcomeIds: ["fruit-morning", "fuselage-cache", "cave-supplies-found", "foraging-success"],
    firstRole: "drupal-developer", secondRole: "product-owner",
    firstPreferredIds: ["cast-zach"], secondPreferredIds: ["cast-walter"],
    first: [{ text: "Food acquired. I'd like to move lunch to In Progress.", emotion: "happy", animation: "agree" }, { text: "Supplies found. I support making lunch the next priority.", emotion: "happy", animation: "celebrate" }],
    second: [{ text: "Finally, a backlog item everyone wants to pick up.", emotion: "happy", animation: "laugh" }, { text: "Approved. This is the first priority with unanimous support.", emotion: "happy", animation: "agree" }],
  },
  {
    id: "crew-council-jorge-maria-v1", outcomeIds: ["shared-work", "essentials-protected", "leader-chosen"], motifIds: ["scrum-metrics", "team-capacity"],
    firstRole: "scrum-master", secondRole: "director", firstPreferredIds: ["cast-jorge"], secondPreferredIds: ["cast-maria"],
    first: [{ text: "We have a clear crew plan. Let's keep the goal useful and achievable.", emotion: "relieved", animation: "agree" }, { text: "Plan agreed. We'll check progress without turning people into metrics.", emotion: "happy", animation: "agree" }],
    second: [{ text: "Good. Let's make sure everyone has support as we carry it out.", emotion: "relieved", animation: "agree" }, { text: "We'll help one another and adjust if someone needs a hand.", emotion: "happy", animation: "agree" }],
  },
];

const injuryTemplate: DialogueTemplate = {
  id: "injury-check-in-v1", outcomeIds: [], firstRole: "drupal-developer", secondRole: "manager",
  first: [{ text: "Someone's hurt. Let's check on them before we move.", emotion: "afraid", animation: "concern" }, { text: "We need to make sure the injured crew member is okay.", emotion: "neutral", animation: "agree" }],
  second: [{ text: "Agreed. We'll take care of the person first, then regroup.", emotion: "relieved", animation: "agree" }, { text: "Let's pause and help them. The next step can wait a moment.", emotion: "neutral", animation: "agree" }],
};

// Used only when a specific exchange's required roles are absent. These lines
// stay broad enough to fit the recorded cue and never assert a new story fact.
const fallbackVoices: Record<string, Partial<Record<"success" | "setback" | "neutral" | "serious", string | readonly string[]>>> = {
  "cast-daniel": { success: ["Useful result. I'll note what worked before we change anything.", "Good result; I'll document what changed before the configuration drifts."], setback: ["Let's isolate what failed, one step at a time.", "That's a regression. Let's test one variable before changing anything else."], neutral: "I'll check the details before we choose the next step.", serious: "I know this is difficult. I'm here, and we can work out what comes next together." },
  "cast-jim-young": { success: ["It worked. Imagine what we could get away with next.", "Success. My next idea has even fewer precautions."], setback: ["That was the cautious version. I have a much worse idea.", "Maybe the repair needs more force. I volunteer someone else's hands."], neutral: "The shortcut looks suspicious. That's how you know it's a shortcut.", serious: "No joke for this one. I'm here with you." },
  "cast-samantha": { success: ["Good! The fix passed my emergency QA checklist. I think.", "It worked! My emergency QA checklist can take a little break."], setback: ["Okay, that didn't work. I have a second plan and a third nervous thought.", "That felt like a failed deploy. My backup plan has a backup plan."], neutral: "I can help. I may narrate my concerns while I do.", serious: "I'm worried too. We don't have to face the next part alone." },
  "cast-tony": { success: ["That worked. I'll add 'think first' to the sprint backlog.", "Successful deployment. I volunteer to find out what we shipped."], setback: ["I'll try another approach. Details can catch up with me.", "The hotfix didn't hold. I'll try again after someone explains the rollback."], neutral: "I volunteer to help. We'll figure out the plan on the way.", serious: "I'm staying with the crew. Tell me how I can help." },
  "cast-tim": { success: ["Good work, everyone. Let's take the next step together.", "That's a team win. We'll leave enough capacity for whatever comes next."], setback: ["We'll adjust the plan and share the work fairly.", "We hit a blocker. Let's reduce the scope and protect the team's energy."], neutral: "Let's check in and agree on the next step.", serious: "Take the time you need. I'll make sure we're looking after each other." },
  "cast-esther-morgan": { success: ["Good. I'll note what we learned and check that everyone is okay.", "Eagle Eye checklist updated. I'll make sure everyone knows what worked."], setback: ["Let's record what changed and make sure nobody needs help.", "I'll note what changed so we can retry safely; no guessing from the checklist."], neutral: "I'll keep track of what we know so far.", serious: "I'm so sorry. I'll stay close and help however I can." },
  "cast-jacob-ramirez": { success: ["That small fix shipped. I'll see what else we can use.", "Small fix shipped. I'll quietly keep an eye on it."], setback: ["Want to pair-debug and see what went wrong?", "Maybe a quick pair-debug? I'm good at the quiet part."], neutral: "I'm here if you need help.", serious: "I'm here. You don't have to say anything." },
  "cast-michelle": { success: ["Nice work. I'll help with the next part.", "I'll handle the follow-up. Please let this stay out of Salesforce."], setback: ["I'll pitch in. Please let this island stay Salesforce-free.", "I can help with the blocker. It does not need a Salesforce ticket."], neutral: "What can I take off someone's hands?", serious: "I'm here to help. Tell me what would make this moment easier." },
  "cast-zach": { success: ["Good. How close are we to food?", "Great. Lunch can move from In Progress to Done."], setback: ["That plan didn't work. Is finding food still on the board?", "The estimate was wrong. That's not lunch's fault."], neutral: "I'll help. Let me know if food becomes the priority.", serious: "I'll stay with everyone. We can talk when you're ready." },
  "cast-jessica-adlock": { success: ["I'm glad that met the acceptance criteria. Let's check how everyone is doing.", "That meets today's acceptance criteria. Does everyone feel okay about the next step?"], setback: ["That's disappointing. We can talk through another option together.", "Let's revisit the acceptance criteria and understand what missed the mark."], neutral: "What does everyone need before we decide?", serious: "I'm listening. There's no pressure to be okay right away." },
  "cast-jorge": { success: ["Progress recorded. Let's agree on one clear next goal.", "Goal met. I'll bring the metric back at our next retrospective."], setback: ["We hit a blocker. Let's adapt the plan, not blame the crew.", "Blocker logged. New plan, same goal; we'll keep the metric in perspective."], neutral: "What's our next useful milestone?", serious: "We'll pause the goals. Right now, let's be here for one another." },
  "cast-maria": { success: ["The team delivered this together. Let's make sure everyone is all right.", "Good work. I'll make sure the people behind this effort get credit."], setback: ["We'll support each other and reset the sprint plan together.", "Let's reset expectations and support the crew before we take on more."], neutral: "Let's check in with everyone before we move.", serious: "I'm here with you. We'll take care of one another through this." },
  "cast-richard-wang": { success: ["Good result. Let's keep the approach that worked.", "The result matches our check. Let's preserve the method and avoid needless changes."], setback: ["Let's change one thing at a time and see what the evidence says.", "One variable at a time. We don't need a second regression."], neutral: "I'll help make a careful plan from what we know.", serious: "We can set the problem-solving aside for a minute. I'm here." },
  "cast-steve": { success: ["That's one task moved to Done. I'll help with the next.", "Looks good. I'll take the next task and help the crew keep moving."], setback: ["It's all right. We can pair-debug this together.", "I'll help test another approach. No one has to debug this alone."], neutral: "Give me a job and I'll get started.", serious: "I'm here. You can lean on me while we take this one step at a time." },
  "cast-walter": { success: ["Excellent. I approve this very practical feature request.", "Feature approved. Best MVP we've had; no roadmap required."], setback: ["The island has rejected our request. I'll submit a friendlier one.", "I'm requesting a change to the requirements. The island has not approved it yet."], neutral: "I have a suggestion, and this time it may even be in scope.", serious: "I'll keep the jokes for later. I'm here if anyone needs me." },
  "cast-courtney": { success: ["Good. I—I'll watch for a safe chance to fish when we reach the water.", "One step forward. I'll keep an eye out for a safe fishing spot."], setback: ["No use rushing the next step. I'll try the water when conditions are safer.", "Let's check our supplies and wait for a better fishing opportunity."], neutral: "I—I can check the shoreline when we have a safe route.", serious: "I'm here with you. We can take this one step at a time." },
};

const fallbackMotifs: Record<string, string> = {
  "cast-daniel": "drupal-debug", "cast-jim-young": "drupal-debug", "cast-samantha": "deployment-hotfix",
  "cast-tony": "deployment-hotfix", "cast-tim": "team-capacity", "cast-esther-morgan": "scrum-checklist",
  "cast-jacob-ramirez": "pair-debugging", "cast-michelle": "salesforce-integration", "cast-zach": "food-backlog",
  "cast-jessica-adlock": "product-scope", "cast-jorge": "scrum-metrics", "cast-maria": "team-capacity",
  "cast-richard-wang": "drupal-debug", "cast-steve": "pair-debugging", "cast-walter": "product-scope", "cast-courtney": "fishing-opportunity",
};

interface DecisionPromptTemplate {
  id: string;
  decisionIds: readonly string[];
  firstRole: CharacterProfile["teamRoles"][number];
  secondRole: CharacterProfile["teamRoles"][number];
  firstPreferredIds?: readonly string[];
  secondPreferredIds?: readonly string[];
  lines: readonly [string, string];
}

const promptTemplates: readonly DecisionPromptTemplate[] = [
  { id: "shoreline-triage-prompt-v1", decisionIds: ["campaign-shoreline-priority"], firstRole: "manager", secondRole: "product-owner", firstPreferredIds: ["cast-tim"], secondPreferredIds: ["cast-jessica-adlock", "cast-walter"], lines: ["Let's secure what the crew needs most before the tide rises.", "Agreed. Let's keep the choice focused on what we can use right now."] },
  { id: "shelter-scope-prompt-v1", decisionIds: ["campaign-shelter-reinforcement", "shelter-politics"], firstRole: "product-owner", secondRole: "scrum-master", firstPreferredIds: ["cast-jessica-adlock", "cast-walter"], secondPreferredIds: ["cast-jorge"], lines: ["Before we build, can we agree what 'shelter' means for tonight?", "Scope suggestion: dry enough to sleep. The resort features can wait."] },
  { id: "repair-plan-prompt-v1", decisionIds: ["motorboat-repair", "motorboat-recovery", "repair-radio"], firstRole: "drupal-developer", secondRole: "manager", firstPreferredIds: ["cast-daniel", "cast-richard-wang"], secondPreferredIds: ["cast-tim"], lines: ["Let's inspect the fault before we start changing parts.", "Good. One repair at a time, and stop if anyone gets hurt."] },
  { id: "food-plan-prompt-v1", decisionIds: ["campaign-daybreak-survey"], firstRole: "drupal-developer", secondRole: "product-owner", firstPreferredIds: ["cast-zach"], secondPreferredIds: ["cast-walter", "cast-jessica-adlock"], lines: ["Before we vote, can we put finding food near the top of the list?", "Agreed. Let's make sure the plan works for everyone, not just the loudest stomach."] },
  { id: "water-plan-prompt-v1", decisionIds: ["campaign-freshwater-run"], firstRole: "drupal-developer", secondRole: "director", firstPreferredIds: ["cast-esther-morgan"], secondPreferredIds: ["cast-maria"], lines: ["Let's choose a way to collect water that we can actually bring back safely.", "Agreed. We should keep the crew together and account for what we collect."] },
  { id: "first-night-plan-prompt-v1", decisionIds: ["campaign-first-night"], firstRole: "manager", secondRole: "scrum-master", firstPreferredIds: ["cast-tim"], secondPreferredIds: ["cast-jorge"], lines: ["We have one evening. Let's agree on the most useful job before it gets dark.", "One clear goal at a time. The island has already given us enough backlog."] },
  { id: "wildlife-distance-prompt-v1", decisionIds: ["campaign-wildlife-encounter"], firstRole: "drupal-developer", secondRole: "manager", firstPreferredIds: ["cast-tony"], secondPreferredIds: ["cast-tim"], lines: ["I can help, but let's give the boar room and keep the crew together.", "Safety first. We have time to choose a plan before anyone rushes in."] },
  { id: "medical-care-prompt-v1", decisionIds: ["campaign-medical-triage"], firstRole: "director", secondRole: "product-owner", firstPreferredIds: ["cast-maria"], secondPreferredIds: ["cast-jessica-adlock"], lines: ["Let's check what the injured crew members need before we set off again.", "Yes. We can make space for care and still plan the next step together."] },
  { id: "cave-safety-prompt-v1", decisionIds: ["campaign-cave-expedition"], firstRole: "drupal-developer", secondRole: "manager", firstPreferredIds: ["cast-daniel", "cast-richard-wang"], secondPreferredIds: ["cast-tim"], lines: ["Let's decide how far to explore and keep a safe way back in mind.", "Agreed. No one goes in alone, and we turn back if it stops feeling safe."] },
  { id: "storm-shelter-prompt-v1", decisionIds: ["campaign-storm-warning"], firstRole: "manager", secondRole: "product-owner", firstPreferredIds: ["cast-tim"], secondPreferredIds: ["cast-jessica-adlock", "cast-walter"], lines: ["The weather is turning. Let's choose the safest preparation we can make now.", "Let's keep the plan practical and tied to the cover and supplies we have."] },
  { id: "signal-window-prompt-v1", decisionIds: ["campaign-signal-attempt", "campaign-signal-window", "campaign-signal-approach"], firstRole: "drupal-developer", secondRole: "scrum-master", firstPreferredIds: ["cast-daniel", "cast-richard-wang"], secondPreferredIds: ["cast-jorge"], lines: ["Let's use only the signal gear and route we know are ready.", "We have one clear goal: make the attempt while the window is open."] },
  { id: "boat-plan-prompt-v1", decisionIds: ["motorboat-discovery", "motorboat-group-launch", "motorboat-recovery"], firstRole: "drupal-developer", secondRole: "manager", firstPreferredIds: ["cast-daniel", "cast-richard-wang"], secondPreferredIds: ["cast-tim"], lines: ["Let's check the boat and the conditions before we commit the crew.", "Agreed. We'll decide together and keep the group accounted for."] },
  { id: "coastal-route-prompt-v1", decisionIds: ["campaign-coastal-expedition", "campaign-coastal-hazard"], firstRole: "drupal-developer", secondRole: "manager", firstPreferredIds: ["cast-courtney", "cast-esther-morgan", "cast-daniel"], secondPreferredIds: ["cast-tim"], lines: ["Let's follow a safe route and check whether the shallows are worth fishing.", "Keep the crew together. If the surf turns unsafe, we choose another moment."] },
];

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function chooseSpeaker(pool: readonly string[], seed: string, recent: readonly CrewDialogueExchange[]): string | undefined {
  if (!pool.length) return undefined;
  const recentCount = new Map<string, number>();
  for (const exchange of recent.slice(-5)) for (const { characterId } of exchange.lines) recentCount.set(characterId, (recentCount.get(characterId) ?? 0) + 1);
  const weights = pool.map((characterId) => {
    const profile = CHARACTER_PROFILES.find(({ characterId: id }) => id === characterId);
    const frequencyWeight = profile?.voice.talkativeness === "high" ? 3 : profile?.voice.talkativeness === "low" ? 1 : 2;
    return frequencyWeight / (1 + (recentCount.get(characterId) ?? 0));
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = (stableHash(seed) / 0x1_0000_0000) * total;
  for (let index = 0; index < pool.length; index += 1) {
    cursor -= weights[index]!;
    if (cursor < 0) return pool[index];
  }
  return pool.at(-1);
}

/** Selects only authored dialogue whose exact resolved outcome is known. */
export function selectResolvedCrewDialogue(
  roomCode: string,
  event: Pick<EventEntry, "id" | "outcomeId" | "resolution" | "deathCharacterIds" | "socialCue">,
  participantIds: readonly string[],
  priorExchanges: readonly CrewDialogueExchange[] = [],
): CrewDialogueExchange | undefined {
  const hasDeath = (event.deathCharacterIds?.length ?? 0) > 0 || Boolean(event.resolution?.statusChanges.some(({ after }) => after === "ghost"));
  // Daily consumption/starvation changes are not fresh injuries. Keep a mixed
  // outcome's injury cue tied to damage explicitly caused by this outcome.
  const hasInjury = Boolean(event.resolution?.resourceChanges.some((change) => change.scope === "character" && change.resource === "health" && change.delta < 0 && change.cause === "outcome"));
  const deceased = new Set([
    ...(event.deathCharacterIds ?? []),
    ...(event.resolution?.statusChanges.filter(({ after }) => after === "ghost").map(({ characterId }) => characterId) ?? []),
  ]);
  // A casualty can still be represented in an event's affected characters,
  // but must never be selected as a voice for the post-event exchange.
  const present = new Set(participantIds.filter((characterId) => !deceased.has(characterId)));
  const profiles = CHARACTER_PROFILES.filter(({ characterId }) => present.has(characterId));
  const matchedTemplates = hasDeath ? [templates[0]!]
    : hasInjury ? [injuryTemplate]
      : templates.filter((candidate) => Boolean(event.outcomeId && candidate.outcomeIds.includes(event.outcomeId)));
  const recentTemplates = new Set(priorExchanges.slice(-3).map(({ templateId }) => templateId));
  const recentMotifs = new Set(priorExchanges.slice(-5).flatMap(({ motifIds = [] }) => motifIds));
  const template = matchedTemplates.find((candidate) =>
    profiles.some(({ teamRoles }) => teamRoles.includes(candidate.firstRole))
    && profiles.some(({ teamRoles }) => teamRoles.includes(candidate.secondRole))
    && !recentTemplates.has(candidate.id)
    && !(candidate.motifIds ?? []).some((motif) => recentMotifs.has(motif)));
  if (!template) {
    const crew = profiles.map(({ characterId }) => characterId).sort();
    if (crew.length === 0) return undefined;
    const seed = `${roomCode}:${event.id}:unmatched-${event.socialCue ?? "neutral"}`;
    const firstId = chooseSpeaker(crew, `${seed}:first`, priorExchanges)!;
    const remaining = crew.filter((id) => id !== firstId);
    const secondId = chooseSpeaker(remaining, `${seed}:second`, priorExchanges);
    const serious = hasDeath || hasInjury;
    const generic = hasDeath ? "We lost someone. Let's stay close and take a moment together." : hasInjury ? "Someone is hurt. Let's check on them before we move." : event.socialCue === "success" ? "That gives us a little progress to build on." : event.socialCue === "setback" ? "That didn't go as planned. Let's see what we can still use." : event.socialCue === "danger" ? "Let's check that everyone is safe before we move." : "All right. Let's work out the next step together.";
    const pickVoice = (characterId: string, cue: "success" | "setback" | "neutral" | "serious") => {
      const line = fallbackVoices[characterId]?.[cue];
      return Array.isArray(line) ? line[stableHash(`${seed}:${characterId}:${cue}`) % line.length]! : line as string | undefined;
    };
    const cue = event.socialCue === "success" || event.socialCue === "setback" ? event.socialCue : "neutral";
    const firstMotif = !serious && cue !== "neutral" ? fallbackMotifs[firstId] : undefined;
    const secondMotif = !serious && cue !== "neutral" && secondId ? fallbackMotifs[secondId] : undefined;
    const cooled = (motif: string | undefined) => Boolean(motif && recentMotifs.has(motif));
    const firstText = serious ? pickVoice(firstId, "serious") ?? generic : cooled(firstMotif) ? generic : pickVoice(firstId, cue) ?? generic;
    const secondText = serious ? (hasDeath ? "There's no need to rush past this. I'm here if anyone needs support." : pickVoice(secondId ?? firstId, "serious") ?? "We'll take care of the injured person, then regroup.") : secondId ? cooled(secondMotif) ? (cue === "success" ? "Good. We can take the next problem one step at a time." : "I'll help figure out what to do next.") : pickVoice(secondId, cue) ?? (cue === "success" ? "Good. We can take the next problem one step at a time." : "I'll help figure out what to do next.") : generic;
    const motifs = [...new Set([...(cooled(firstMotif) ? [] : firstMotif ? [firstMotif] : []), ...(cooled(secondMotif) ? [] : secondMotif ? [secondMotif] : [])])];
    return { id: `${event.id}:crew:contextual-fallback-v1`, templateId: "contextual-fallback-v1", lines: [
      { characterId: firstId, text: firstText, emotion: hasDeath ? "sad" : serious || event.socialCue === "danger" ? "afraid" : event.socialCue === "success" ? "happy" : "neutral", animation: hasDeath ? "sad" : serious || event.socialCue === "danger" ? "concern" : "agree" },
      ...(secondId ? [{ characterId: secondId, text: secondText, emotion: hasDeath ? "sad" as const : serious ? "afraid" as const : "neutral" as const, animation: hasDeath ? "sad" as const : serious ? "concern" as const : "agree" as const }] : []),
    ], ...(motifs.length ? { motifIds: motifs } : {}) };
  }
  const actorId = event.resolution?.assignment?.actorCharacterId;
  const byRole = (role: CharacterProfile["teamRoles"][number], exclude?: string, expertise?: CharacterProfile["voice"]["expertise"][number]) => profiles
    .filter(({ characterId, teamRoles, voice }) => characterId !== exclude && teamRoles.includes(role) && (!expertise || voice.expertise.includes(expertise)))
    .map(({ characterId }) => characterId).sort();
  const roleCandidates = byRole(template.firstRole);
  const expertCandidates = byRole(template.firstRole, undefined, template.firstExpertise);
  const firstCandidates = expertCandidates.length ? expertCandidates : roleCandidates;
  const preferredFirst = firstCandidates.filter((id) => template.firstPreferredIds?.includes(id));
  const firstPool = preferredFirst.length ? preferredFirst : firstCandidates;
  const firstCharacterId = actorId && firstPool.includes(actorId) ? actorId : chooseSpeaker(firstPool, `${roomCode}:${event.id}:${template.id}:first`, priorExchanges);
  if (!firstCharacterId) return undefined;
  const secondCandidates = byRole(template.secondRole, firstCharacterId);
  const preferredSecond = secondCandidates.filter((id) => template.secondPreferredIds?.includes(id));
  const secondPool = preferredSecond.length ? preferredSecond : secondCandidates;
  const secondCharacterId = chooseSpeaker(secondPool, `${roomCode}:${event.id}:${template.id}:second`, priorExchanges);
  if (!secondCharacterId) return undefined;
  const first = template.first[stableHash(`${roomCode}:${event.id}:${template.id}:line-1`) % template.first.length]!;
  const second = template.second[stableHash(`${roomCode}:${event.id}:${template.id}:line-2`) % template.second.length]!;
  const lines: CrewDialogueLine[] = [
    { characterId: firstCharacterId, ...first },
    { characterId: secondCharacterId, ...second },
  ];
  if (template.thirdRole && template.third) {
    const thirdCandidates = byRole(template.thirdRole, firstCharacterId).filter((id) => id !== secondCharacterId);
    const thirdCharacterId = chooseSpeaker(thirdCandidates, `${roomCode}:${event.id}:${template.id}:third`, priorExchanges);
    if (thirdCharacterId) lines.push({ characterId: thirdCharacterId, ...template.third[stableHash(`${roomCode}:${event.id}:${template.id}:line-3`) % template.third.length]! });
  }
  return {
    id: `${event.id}:crew:${template.id}`,
    templateId: template.id,
    ...(template.motifIds?.length ? { motifIds: [...template.motifIds] } : {}),
    lines,
  };
}

/** Development-only explanation built around the production selector's result. */
export function traceResolvedCrewDialogue(
  roomCode: string,
  event: Pick<EventEntry, "id" | "outcomeId" | "resolution" | "deathCharacterIds" | "socialCue">,
  participantIds: readonly string[],
  priorExchanges: readonly CrewDialogueExchange[] = [],
) {
  const exchange = selectResolvedCrewDialogue(roomCode, event, participantIds, priorExchanges);
  const present = new Set(participantIds);
  const roles = CHARACTER_PROFILES.filter(({ characterId }) => present.has(characterId)).flatMap(({ teamRoles }) => teamRoles);
  const hasDeath = (event.deathCharacterIds?.length ?? 0) > 0 || Boolean(event.resolution?.statusChanges.some(({ after }) => after === "ghost"));
  const hasInjury = Boolean(event.resolution?.resourceChanges.some((change) => change.scope === "character" && change.resource === "health" && change.delta < 0 && change.cause === "outcome"));
  const applicable = hasDeath ? [templates[0]!] : hasInjury ? [injuryTemplate] : templates.filter(({ outcomeIds }) => Boolean(event.outcomeId && outcomeIds.includes(event.outcomeId)));
  const eligibleByRole = applicable.filter(({ firstRole, secondRole }) => roles.includes(firstRole) && roles.includes(secondRole));
  const recentTemplateIds = new Set(priorExchanges.slice(-3).map(({ templateId }) => templateId));
  const recentMotifs = new Set(priorExchanges.slice(-5).flatMap(({ motifIds = [] }) => motifIds));
  const eligibleAfterCooldown = eligibleByRole.filter((candidate) => !recentTemplateIds.has(candidate.id) && !(candidate.motifIds ?? []).some((motif) => recentMotifs.has(motif)));
  const rejectedReasons = applicable.length === 0
    ? ["No exact-outcome exchange is authored; a context-safe fallback is used."]
    : eligibleByRole.length === 0
      ? applicable.map(({ id, firstRole, secondRole }) => `${id}: requires present speakers with ${firstRole} and ${secondRole} roles.`)
      : eligibleAfterCooldown.length === 0
        ? ["Matching exchanges were suppressed by the recent three-exchange template or five-exchange motif cooldown."]
        : [];
  return {
    exchange,
    selectedTemplateId: exchange?.templateId ?? null,
    publicFacts: {
      eventId: event.id,
      outcomeId: event.outcomeId ?? null,
      socialCue: event.socialCue ?? "neutral",
      freshDeath: hasDeath,
      freshInjury: hasInjury,
      participantCount: participantIds.length,
    },
    rejectedReasons,
  };
}

/** Builds a decision-opening exchange from the prompt and facts already known; it cannot see the vote or result. */
export function selectDecisionPromptDialogue(roomCode: string, decisionId: string, participantIds: readonly string[], context?: DialoguePublicContext, prior: readonly CrewDialogueExchange[] = []): CrewDialogueExchange | undefined {
  const instigator = context ? selectInstigatorPrompt(roomCode, decisionId, context, prior) : undefined;
  if (instigator) return instigator;
  const template = promptTemplates.find((candidate) => candidate.decisionIds.includes(decisionId));
  if (!template) return undefined;
  const present = new Set(participantIds);
  const profiles = CHARACTER_PROFILES.filter(({ characterId }) => present.has(characterId));
  const candidates = (role: CharacterProfile["teamRoles"][number], preferred: readonly string[] | undefined, exclude?: string) => {
    const ids = profiles.filter(({ characterId, teamRoles }) => characterId !== exclude && teamRoles.includes(role)).map(({ characterId }) => characterId).sort();
    const preferredIds = ids.filter((id) => preferred?.includes(id));
    return preferredIds.length ? preferredIds : ids;
  };
  const firstPool = candidates(template.firstRole, template.firstPreferredIds);
  const firstId = firstPool[stableHash(`${roomCode}:${decisionId}:open:${template.id}:first`) % firstPool.length];
  if (!firstId) return undefined;
  const secondPool = candidates(template.secondRole, template.secondPreferredIds, firstId);
  const secondId = secondPool[stableHash(`${roomCode}:${decisionId}:open:${template.id}:second`) % secondPool.length];
  if (!secondId) return undefined;
  return {
    id: `${roomCode}:${decisionId}:open:${template.id}`,
    templateId: template.id,
    lines: [
      { characterId: firstId, text: template.lines[0], emotion: "neutral", animation: "agree" },
      { characterId: secondId, text: template.lines[1], emotion: "neutral", animation: "agree" },
    ],
  };
}
