import { LoopOnce, LoopRepeat, type AnimationAction, type AnimationMixer } from "three";

export interface AnimationRequest {
  name: string;
  once: boolean;
  eventId: string;
  elapsedSeconds?: number;
  /** Keep a one-shot's final pose instead of returning to idle (used for death). */
  holdAtEnd?: boolean;
}

/** Owns action lifecycle only. Drei remains responsible for updating the mixer. */
export function createAnimationPlayback(
  mixer: AnimationMixer,
  actions: Record<string, AnimationAction | null | undefined>,
  idleName: string,
  onMissing: (name: string) => void = () => {},
) {
  const fadeSeconds = 0.2;
  const fading = new Map<AnimationAction, number>();
  const used = new Set<AnimationAction>();
  const reported = new Set<string>();
  let active: AnimationAction | undefined;
  let oneShot = false;
  let holdAtEnd = false;
  let lastRequest = "";

  function stop() {
    for (const action of used) action.stop();
    fading.clear();
    used.clear();
    active = undefined;
    oneShot = false;
    holdAtEnd = false;
  }

  function start(action: AnimationAction, once: boolean, elapsedSeconds = 0, hold = false) {
    const previous = active;
    fading.delete(action);
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
    action.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.time = Math.min(elapsedSeconds, action.getClip().duration);
    action.play();
    if (hold && once && elapsedSeconds >= action.getClip().duration) action.paused = true;
    if (previous && previous !== action) {
      // A clamped action is paused but still contributes its pose. Fade it too.
      previous.fadeOut(fadeSeconds);
      fading.set(previous, mixer.time + fadeSeconds);
      action.fadeIn(fadeSeconds);
    }
    used.add(action);
    active = action;
    oneShot = once;
    holdAtEnd = hold;
  }

  function idle() {
    const action = actions[idleName];
    if (action) start(action, false);
    else stop();
  }

  return {
    request(request: AnimationRequest) {
      const key = JSON.stringify([request.name, request.once, request.eventId, request.holdAtEnd]);
      if (key === lastRequest) return;
      lastRequest = key;
      if (!request.name) { stop(); return; }
      const action = actions[request.name];
      if (!action) {
        if (!reported.has(request.name)) { reported.add(request.name); onMissing(request.name); }
        idle();
        return;
      }
      const once = request.once && request.name !== idleName;
      const elapsed = Number.isFinite(request.elapsedSeconds) ? Math.max(0, request.elapsedSeconds!) : 0;
      if (once && elapsed >= action.getClip().duration && !request.holdAtEnd) { idle(); return; }
      start(action, once, once ? elapsed : 0, Boolean(request.holdAtEnd));
    },
    tick(elapsedSeconds?: number) {
      if (active && oneShot) {
        if (elapsedSeconds !== undefined && Number.isFinite(elapsedSeconds)) {
          active.time = Math.max(active.time, elapsedSeconds);
        }
        if (!holdAtEnd && (active.paused || active.time >= active.getClip().duration)) idle();
      }
      for (const [action, stopAt] of fading) {
        if (mixer.time >= stopAt) { action.stop(); fading.delete(action); }
      }
    },
    dispose() { stop(); lastRequest = ""; },
  };
}
