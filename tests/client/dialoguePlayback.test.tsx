import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const audio = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn() }));
vi.mock("../../src/audio/audioSystem", () => ({ isAudioUnlocked:()=>true, subscribeAudioUnlocked:()=>()=>{}, playCharacterVoice:audio.play }));
import { useDialoguePlayback } from "../../src/game/story/useDialoguePlayback";
import type { CrewDialogueExchange } from "../../src/shared/domain";
const exchange: CrewDialogueExchange = { id:"exchange-1",templateId:"test",lines:[{characterId:"cast-tony",text:"Hello there.",emotion:"neutral",animation:"agree"},{characterId:"cast-jim-young",text:"Hello Tony.",emotion:"neutral",animation:"agree"}] };
beforeEach(()=>{
  vi.useFakeTimers();
  audio.play.mockReset();audio.stop.mockReset();audio.play.mockReturnValue(audio.stop);
  Object.defineProperty(document,"hidden",{configurable:true,value:false});
  vi.stubGlobal("matchMedia",vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
describe("dialogue playback",()=>{
  it("does not replay on snapshot rerenders and plays speakers sequentially",()=>{
    const {result,rerender,unmount}=renderHook(({value})=>useDialoguePlayback(value),{initialProps:{value:exchange}});
    expect(audio.play).toHaveBeenCalledWith("cast-tony");
    act(()=>{vi.advanceTimersByTime(128);});
    const partial=result.current.visibleText[0];
    rerender({value:structuredClone(exchange)});
    expect(result.current.visibleText[0]).toBe(partial);
    expect(audio.play).toHaveBeenCalledTimes(1);
    act(()=>{vi.advanceTimersByTime(700);});
    expect(audio.stop).toHaveBeenCalled();
    expect(audio.play).toHaveBeenLastCalledWith("cast-jim-young");
    unmount();expect(audio.stop).toHaveBeenCalledTimes(2);
  });
  it("skip stops speech, reveals text and remains skipped across rerenders",()=>{
    const {result,rerender}=renderHook(({value})=>useDialoguePlayback(value),{initialProps:{value:exchange}});
    act(()=>result.current.skip());
    expect(result.current.visibleText).toEqual(exchange.lines.map(l=>l.text));
    expect(audio.stop).toHaveBeenCalledTimes(1);
    rerender({value:structuredClone(exchange)});
    act(()=>{vi.advanceTimersByTime(2000);});
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("cancels speech when the tab is hidden or the exchange disappears",()=>{
    const {rerender}=renderHook(({value}:{value?:CrewDialogueExchange})=>useDialoguePlayback(value),{initialProps:{value:exchange as CrewDialogueExchange | undefined}});
    act(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));});
    expect(audio.stop).toHaveBeenCalledTimes(1);
    act(()=>{vi.advanceTimersByTime(900);});
    expect(audio.play).toHaveBeenCalledTimes(1);
    rerender({value:undefined});
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("reduced motion shows whole lines without disabling recorded speech",()=>{
    vi.stubGlobal("matchMedia",vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
    const {result}=renderHook(()=>useDialoguePlayback(exchange));
    expect(result.current.visibleText).toEqual(exchange.lines.map(l=>l.text));
    expect(result.current.reducedMotion).toBe(true);
    expect(audio.play).toHaveBeenCalledWith("cast-tony");
  });
});
