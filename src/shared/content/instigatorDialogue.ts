import type { CrewDialogueExchange, PrivateRoomState } from "../domain";

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
export function dialogueRequirementsMet(requirements: DialogueRequirements, context: DialoguePublicContext): boolean {
  return (requirements.requiredSpeakerIds ?? []).every(id => context.livingCharacterIds.includes(id))
    && (!requirements.requiredEncounter || context.encounter === requirements.requiredEncounter)
    && (!requirements.requiredOwnedItem || Boolean(context.itemIdsByCharacterId[requirements.requiredOwnedItem.characterId]?.includes(requirements.requiredOwnedItem.itemId)));
}
export function publicDialogueContext(state: PrivateRoomState, decisionId?: string): DialoguePublicContext {
  const living = Object.values(state.characters).filter(c => c.status === "alive");
  return { encounter: decisionId === "campaign-bear-encounter" ? "bear" : "other", livingCharacterIds: living.map(c => c.characterId),
    itemIdsByCharacterId: Object.fromEntries(living.map(c => [c.characterId, c.startingItemId ? [c.startingItemId] : []])) };
}

const exchanges = [
  { id: "jim-tony-bow", decisions: ["campaign-bear-encounter"], item: "improvised-bow", lines: ["Hey Tony, you've got an improvised bow. I think we're about to solve dinner.", "You keep saying ‘we’ while pointing at me."] },
  { id: "jim-tony-knife", decisions: ["campaign-bear-encounter"], item: "knife", lines: ["Tony, you've got a knife. The bear hasn't even brought cutlery.", "Your confidence is doing a lot of work here."] },
  { id: "jim-tony-cave", decisions: ["campaign-cave-expedition"], lines: ["Tony, that dark passage looks like a shortcut. Very little traffic.", "Possibly because nobody comes back that way."] },
  { id: "jim-tony-repair", decisions: ["motorboat-repair", "motorboat-recovery", "repair-radio"], lines: ["Tony, try hitting it harder. That's basically advanced troubleshooting.", "I'll put you down as the technical reviewer."] },
] as const;

export function selectInstigatorPrompt(roomCode: string, decisionId: string, context: DialoguePublicContext, prior: readonly CrewDialogueExchange[] = []): CrewDialogueExchange | undefined {
  const template = exchanges.find(candidate => candidate.decisions.some(id => id === decisionId)
    && !prior.slice(-3).some(previous => previous.templateId === candidate.id)
    && dialogueRequirementsMet({ requiredSpeakerIds: ["cast-jim-young", "cast-tony"],
      ...("item" in candidate ? { requiredEncounter: "bear" as const, requiredOwnedItem: { characterId: "cast-tony", itemId: candidate.item } } : {}) }, context));
  if (!template) {
    const general: Record<string, readonly string[]> = {
      "campaign-cave-expedition": ["That shortcut looks suspicious. We should investigate before it develops a reputation.", "The cave has excellent acoustics for shouting 'my mistake'."],
      "motorboat-repair": ["What if we hit it harder? I am available to supervise.", "We could skip the inspection and let the ocean handle quality assurance."],
      "motorboat-recovery": ["The repair is nearly done, if we stop counting the missing parts.", "I vote for the method with the fewest instructions."],
      "campaign-daybreak-survey": ["Those berries look expensive. That's usually a good sign, right?", "We could taste everything and document the survivors."],
    };
    const lines = general[decisionId];
    const id = `jim-instigator-${decisionId}`;
    if (!lines || !context.livingCharacterIds.includes("cast-jim-young") || prior.slice(-3).some(p => p.templateId === id)) return undefined;
    const index = [...roomCode].reduce((sum,c) => sum+c.charCodeAt(0),0) % lines.length;
    return {id:`${roomCode}:${id}`,templateId:id,lines:[{characterId:"cast-jim-young",text:lines[index]!,emotion:"neutral",animation:"agree"}]};
  }
  return { id: `${roomCode}:${decisionId}:${template.id}`, templateId: template.id, lines: [
    { characterId: "cast-jim-young", text: template.lines[0], emotion: "neutral", animation: "agree" },
    { characterId: "cast-tony", text: template.lines[1], emotion: "neutral", animation: "agree" },
  ] };
}
