// Review probes assert observed behavior, including defects. Not acceptance tests.
import { expect, it } from 'vitest';
import type { PrivateRoomState, CampaignState, DecisionCard } from '../../src/shared/domain';
import { createCampaignDecision, nextCampaignNode, createSignalAttemptCard, createSignalWindowCard, createStormWarningCard, createCaveExpeditionCard, createWildlifeEncounterCard, createCoastalHazardCard } from '../../src/shared/content/campaignRoute';
import { initialCampaignState, beginNextCampaignStep, resolveCurrentDecision, resolvePendingAssignment, resolvePendingPrivateChoice, advancePhase } from '../../src/shared/rules/stateMachine';
import { initialMotorboatRoute } from '../../src/shared/rules/motorboat';
import { PublicGameSnapshotSchema, toPublicSnapshot } from '../../src/shared/protocol';
import { getStoryMapGraph } from '../../src/game/storyMap/storyMapData';

const random = { next: () => 0 };
function room(): PrivateRoomState {
  const ids = ['cast-daniel', 'cast-samantha'];
  return { code:'ABC234', revision:0, phase:'reveal', createdAt:0, lastActivityAt:0, hostPlayerId:'p_0', phaseStartedAt:0, phaseDeadlineAt:0, phaseEndsAt:0, votingOpensAt:null, earliestResolveAt:null,
    players:Object.fromEntries(ids.map((id,i)=>[`p_${i}`,{id:`p_${i}`,displayName:`Player ${i}`,status:'alive',characterId:id,ready:true,connected:true,joinedAt:i}])),
    characters:Object.fromEntries(ids.map(id=>[id,{characterId:id,status:'alive',resources:{food:50,health:100,morale:65,water:50}}])),
    resources:{shelter:50},deck:[],decisionIndex:0,currentDecisionId:null,votesByPlayer:{},eligibleVoterIds:['p_0','p_1'],eventHistory:[],campaign:initialCampaignState(),motorboat:initialMotorboatRoute(),resolutionSequence:0 };
}
function choose(campaign: CampaignState, id: string): CampaignState {
  const card = createCampaignDecision({campaign,startingItemIds:[]})!;
  return nextCampaignNode(campaign,card.options.find(o=>o.id===id)!.outcomes[0]!.campaignEffect!);
}
it('reproduces coastal knowledge incorrectly surviving a low-path signal approach',()=>{
  let c={...initialCampaignState(),node:'daybreak-survey' as const};
  let next=choose(c,'map-coast');
  next=choose({...next,node:'signal-approach'},'use-low-path');
  expect(createSignalWindowCard(next).prompt).toContain('From the ridge');
  expect(createSignalAttemptCard(next,false).options[0]!.outcomes[0]!.weight).toBe(50);
});
it('reproduces an invented braced roof and spring trail after rain collection',()=>{
  expect(createStormWarningCard(initialCampaignState()).options[0]!.label).toContain('reinforced shelter');
  const c=choose({...initialCampaignState(),node:'freshwater-run'},'collect-rain');
  expect(createCaveExpeditionCard(c).prompt).toContain('spring trail');
});
it('reproduces single-person boar narration damaging both survivors',()=>{
  const s=room(); s.deck=[createWildlifeEncounterCard(s.campaign!)]; s.currentDecisionId=s.deck[0]!.id; s.phase='decision'; s.votesByPlayer={p_0:'make-noise',p_1:'make-noise'};
  const result=resolveCurrentDecision(s,0,{next:()=>0.99});
  expect(result.eventHistory.at(-1)!.resolution!.outcomeId).toBe('boar-charge');
  expect(Object.values(result.characters).map(c=>c.resources.health)).toEqual([92,92]);
});
it('reproduces success overwritten by same-resolution starvation',()=>{
  let s=room(); s.campaign={...s.campaign!,node:'signal-attempt',decisionsSinceFoodTick:2};
  for(const c of Object.values(s.characters)) c.resources={...c.resources,food:0,health:10};
  s=beginNextCampaignStep(s,0,random); s.votesByPlayer={p_0:'smoke-beacon',p_1:'smoke-beacon'};
  const result=resolveCurrentDecision(s,1,random);
  expect(result.eventHistory.at(-1)!.outcomeId).toBe('smoke-beacon-success');
  expect(result.endingId).toBe('no-survivors');
});
it('reproduces cove arrival without recording cove discovery',()=>{
  const c=initialCampaignState(); const card=createCoastalHazardCard(c,[]);
  const next=nextCampaignNode({...c,node:'coastal-hazard'},card.options[0]!.outcomes[0]!.campaignEffect!);
  expect(next).toMatchObject({node:'motorboat',coveLocated:false});
});
it('walks deterministic full paths and validates public snapshots',()=>{
  for (const route of ['signal','boat','failed-signal'] as const) {
    let s=beginNextCampaignStep(room(),82_000,random); let now=82_000; let decisions=0;
    const path:string[]=[];
    for(let guard=0;guard<150&&s.phase!=='ending';guard++) {
      PublicGameSnapshotSchema.parse(toPublicSnapshot(s,'p_0'));
      now=s.phaseDeadlineAt!;
      if(s.phase==='decision') {
        decisions++; path.push(s.currentDecisionId!);
        const card=s.deck[0]!;
        const id=card.id==='campaign-escape-project'?(route==='boat'?'try-motorboat':'try-signal'):card.options[0]!.id;
        s={...s,votesByPlayer:{p_0:id,p_1:id},assignmentNominationsByPlayer:{p_0:'cast-daniel',p_1:'cast-daniel'}};
        s=resolveCurrentDecision(s,now,route==='failed-signal'&&card.id==='campaign-signal-attempt'?{next:()=>0.99}:random);
      } else if(s.phase==='assignmentResponse') s=resolvePendingAssignment(s,now,random);
      else if(s.phase==='privateChoice') s=resolvePendingPrivateChoice(s,now,random);
      else s=advancePhase(s,now,random);
    }
    expect(s.phase).toBe('ending');
    expect(s.endingId).toBe(route==='signal'?'signal-rescue':'group-escape');
    expect(decisions).toBe(route==='signal'?15:route==='boat'?16:20);
    console.log(JSON.stringify({route,decisions,deadlineSeconds:now/1000,ending:s.endingId,historyEntries:s.eventHistory.length,path}));
  }
});
it('checks all visual graph edges have endpoints',()=>{
  for(const mode of ['route','encounters','mechanics'] as const) {
    const graph=getStoryMapGraph(mode); const ids=new Set(graph.nodes.map(n=>n.id));
    expect(graph.edges.filter(e=>!ids.has(e.source)||!ids.has(e.target))).toEqual([]);
  }
});
