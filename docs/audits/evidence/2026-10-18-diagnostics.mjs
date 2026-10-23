// Read-only diagnostics for the 2026-10-18 game audit. Run with Node >=24:
// node docs/audits/evidence/2026-10-18-diagnostics.mjs
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { AnimationMixer, AnimationClip, NumberKeyframeTrack, Object3D, LoopOnce } from 'three';

// Node strips TypeScript; resolve the project's extensionless relative imports.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const level = await import('../../../src/scene/world/islandLevel.ts');
const motion = await import('../../../src/scene/routeMotion.ts');
const { resolveCrashBatch } = await import('../../../src/shared/rules/crashRescue.ts');
const { DECISION_CARDS } = await import('../../../src/shared/content/decisionCards.ts');
const { deriveCrewHistoryBeat } = await import('../../../src/scene/crewHistoryDirector.ts');

const routes = ['jungle_clearing', 'rocky_coast', 'waterfall_pool', 'forest_crossroads', 'mountain_foothills'].map(to => {
  const ids = level.findIslandRoute('crash_beach', to);
  const points = motion.roundRouteCorners(ids.map(id => {
    const [x,y,z] = level.ISLAND_ZONES_BY_ID[id].position;
    return {x,y,z};
  }));
  const length = motion.getRouteLength(points);
  let state = motion.createRouteMotionState(), frames = 0, maxSurfaceGap = 0;
  while (state.distance < length && frames < 60000) {
    state = motion.advanceRouteMotion(state,length,1/60);
    const p = motion.sampleRoute(points,state.distance);
    maxSurfaceGap = Math.max(maxSurfaceGap,Math.abs(p.y-level.sampleIslandSurfaceY(p.x,p.z)));
    frames++;
  }
  return {to,ids,meters:+length.toFixed(1),secondsAt60fps:+(frames/60).toFixed(1),maxCenterlineSurfaceGapMeters:+maxSurfaceGap.toFixed(2)};
});
const assets = ['daniel.glb','daniel-animation-library.glb'].map(name => {
  const b = readFileSync(new URL(`../../../public/models/characters/${name}`,import.meta.url));
  const j = JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
  return {name,bytes:b.length,clips:j.animations.map(a=>a.name)};
});
const object = new Object3D(), mixer = new AnimationMixer(object);
const action = mixer.clipAction(new AnimationClip('agree',1,[new NumberKeyframeTrack('.position[x]',[0,1],[0,1])]));
action.setLoop(LoopOnce,1); action.clampWhenFinished=true; action.reset().play(); mixer.update(2);
const first = {running:action.isRunning(),paused:action.paused,time:action.time};
// CharacterModel only resets when the selected action object changes.
action.setLoop(LoopOnce,1); action.clampWhenFinished=true; mixer.update(2);
const repeated = {running:action.isRunning(),paused:action.paused,time:action.time};
const noAttempt = resolveCrashBatch(['cast-daniel','cast-samantha'],[],{next:()=>0.99});
const resources = {food:40,health:100,morale:65,water:50};
// Contradictory crash case: one successful attempt and a later fatal complication.
const rolls = [0,0.99,0.85];
const crashResolution = resolveCrashBatch(['cast-daniel','cast-samantha'],[
  {rescuerCharacterId:'cast-daniel',targetCharacterId:'cast-samantha',itemId:null},
  {rescuerCharacterId:'cast-samantha',targetCharacterId:'cast-daniel',itemId:null},
],{next:()=>rolls.shift()});
const beat = deriveCrewHistoryBeat({phase:'crashResolution',characters:[{characterId:'cast-daniel',status:'alive',resources},{characterId:'cast-samantha',status:'ghost',resources:{...resources,health:0}}],eventHistory:[{id:'crash-fixture',text:'Diagnostic fixture',createdAt:1,deathCharacterIds:['cast-samantha']}],crashResolution});
console.log(JSON.stringify({routes,assets,oneShot:{first,repeated},noAttempt,crashBeatWithDeadTarget:beat,cards:DECISION_CARDS.length,waterChangingOutcomes:DECISION_CARDS.flatMap(c=>c.options.flatMap(o=>o.outcomes)).filter(o=>o.resourceDeltas?.water).length},null,2));
