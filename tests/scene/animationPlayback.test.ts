import { describe, expect, it, vi } from "vitest";
import { AnimationClip, AnimationMixer, NumberKeyframeTrack, Object3D } from "three";
import { createAnimationPlayback } from "../../src/scene/characters/animationPlayback";

function fixture() {
  const root = new Object3D();
  const mixer = new AnimationMixer(root);
  const clip = (name: string) => new AnimationClip(name, 1, [new NumberKeyframeTrack(".position[x]", [0, 1], [0, 1])]);
  const actions = { idle: mixer.clipAction(clip("idle")), cheer: mixer.clipAction(clip("cheer")), fall: mixer.clipAction(clip("fall")) };
  const missing = vi.fn();
  const playback = createAnimationPlayback(mixer, actions, "idle", missing);
  const step = (seconds: number) => { mixer.update(seconds); playback.tick(); };
  return { mixer, actions, playback, missing, step };
}

describe("event-keyed animation playback", () => {
  it("returns a completed one-shot to idle, releases its pose, and replays the same clip for a new event", () => {
    const { playback, actions, step } = fixture();
    playback.request({ name: "cheer", once: true, eventId: "first" });
    step(1.1);
    expect(actions.idle.isRunning()).toBe(true);
    step(0.3);
    expect(actions.cheer.isScheduled()).toBe(false);
    playback.request({ name: "cheer", once: true, eventId: "second" });
    expect(actions.cheer.paused).toBe(false);
    expect(actions.cheer.time).toBe(0);
    expect(actions.cheer.isRunning()).toBe(true);
  });

  it("does not restart on identical snapshots, including after completion", () => {
    const { playback, actions, step } = fixture();
    const request = { name: "cheer", once: true, eventId: "same" };
    playback.request(request); step(0.4); playback.request(request);
    expect(actions.cheer.time).toBeCloseTo(0.4);
    step(0.8); step(0.3); playback.request(request);
    expect(actions.cheer.isRunning()).toBe(false);
    expect(actions.idle.isRunning()).toBe(true);
  });

  it("replaces paused actions and interrupts obsolete one-shots", () => {
    const { playback, actions, mixer, step } = fixture();
    playback.request({ name: "cheer", once: true, eventId: "a" });
    mixer.update(1.1); // Deliberately leave the previous action clamped/paused.
    expect(actions.cheer.paused).toBe(true);
    playback.request({ name: "fall", once: true, eventId: "b" });
    step(0.3);
    expect(actions.cheer.isScheduled()).toBe(false);
    expect(actions.fall.isRunning()).toBe(true);
    playback.request({ name: "idle", once: false, eventId: "c" });
    step(1.1);
    expect(actions.idle.isRunning()).toBe(true);
    expect(actions.fall.isScheduled()).toBe(false);
  });

  it("uses idle for missing clips and warns once per missing name", () => {
    const { playback, actions, missing } = fixture();
    playback.request({ name: "absent", once: true, eventId: "a" });
    playback.request({ name: "absent", once: true, eventId: "b" });
    expect(actions.idle.isRunning()).toBe(true);
    expect(missing).toHaveBeenCalledExactlyOnceWith("absent");
  });

  it("catches up late loads and hidden-tab one-shots without replaying elapsed events", () => {
    const { playback, actions } = fixture();
    playback.request({ name: "cheer", once: true, eventId: "late", elapsedSeconds: 3 });
    expect(actions.cheer.isRunning()).toBe(false);
    expect(actions.idle.isRunning()).toBe(true);
    playback.request({ name: "fall", once: true, eventId: "new", elapsedSeconds: 0.4 });
    expect(actions.fall.time).toBeCloseTo(0.4);
    playback.tick(2);
    expect(actions.idle.isRunning()).toBe(true);
  });

  it("holds a death animation at its final pose, including when the scene loads after the fall", () => {
    const { playback, actions, mixer } = fixture();
    playback.request({ name: "fall", once: true, holdAtEnd: true, eventId: "death", elapsedSeconds: 3 });
    expect(actions.fall.paused).toBe(true);
    expect(actions.fall.time).toBeCloseTo(1);
    playback.tick(3);
    expect(actions.idle.isRunning()).toBe(false);

    playback.request({ name: "idle", once: false, eventId: "new-scene" });
    mixer.update(0.3);
    playback.tick();
    expect(actions.fall.isScheduled()).toBe(false);
  });

  it("stops everything for an empty request or disposal and permits StrictMode restart", () => {
    const { playback, actions } = fixture();
    const request = { name: "cheer", once: true, eventId: "a" };
    playback.request(request); playback.dispose();
    expect(actions.cheer.isScheduled()).toBe(false);
    playback.request(request);
    expect(actions.cheer.isRunning()).toBe(true);
    playback.request({ name: "", once: false, eventId: "off" });
    expect(actions.cheer.isScheduled()).toBe(false);
    expect(actions.idle.isScheduled()).toBe(false);
  });
});
