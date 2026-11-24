import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({sounds:[] as any[],volume:vi.fn()}));
vi.mock("howler",()=>({
  Howler:{volume:mocks.volume,ctx:null},
  Howl:class {
    callbacks=new Map<string,Set<()=>void>>(); status="loading";
    play=vi.fn(()=>{this.emit("play");return 1;});stop=vi.fn();volume=vi.fn();loop=vi.fn();
    constructor(public options:unknown){mocks.sounds.push(this);}
    state(){return this.status;}
    once(event:string,fn:()=>void){if(!this.callbacks.has(event))this.callbacks.set(event,new Set());this.callbacks.get(event)!.add(fn);}
    off(event:string,fn:()=>void){this.callbacks.get(event)?.delete(fn);}
    emit(event:string){const callbacks=[...(this.callbacks.get(event)??[])];this.callbacks.delete(event);callbacks.forEach(fn=>fn());}
    load(){this.status="loading";}
  },
}));
import { getPlayingVoice, playCharacterVoice, stopAllSounds, stopCharacterVoice, unlockAudio } from "../../src/audio/audioSystem";
import { setAudioSetting } from "../../src/audio/audioSettings";
beforeEach(()=>{
  stopCharacterVoice();
  Object.defineProperty(document,"hidden",{configurable:true,value:false});
  vi.spyOn(HTMLMediaElement.prototype,"canPlayType").mockReturnValue("probably");
  unlockAudio();
});
describe("recorded voice audio lifecycle",()=>{
  it("cancels delayed loads and never starts the previous speaker",()=>{
    const firstStop=playCharacterVoice("cast-tony");
    const first=mocks.sounds.at(-1);
    const secondStop=playCharacterVoice("cast-jim-young");
    const second=mocks.sounds.at(-1);
    first.status="loaded";first.emit("load");
    expect(first.play).not.toHaveBeenCalled();
    second.status="loaded";second.emit("load");
    expect(second.play).toHaveBeenCalledTimes(1);
    expect(getPlayingVoice()).toBe("cast-jim-young");
    firstStop();expect(getPlayingVoice()).toBe("cast-jim-young");
    secondStop();expect(getPlayingVoice()).toBeNull();
  });
  it("handles failed loading silently and releases the active voice",()=>{
    playCharacterVoice("cast-samantha");const sound=mocks.sounds.at(-1);
    sound.emit("loaderror");expect(getPlayingVoice()).toBeNull();
    sound.emit("load");expect(sound.play).not.toHaveBeenCalled();
  });
  it("applies voice gain live and stops with the global stop control",()=>{
    playCharacterVoice("cast-courtney");const sound=mocks.sounds.at(-1);
    sound.status="loaded";sound.emit("load");
    setAudioSetting("voices",0);expect(sound.volume).toHaveBeenLastCalledWith(0);
    setAudioSetting("voices",55);expect(sound.volume).toHaveBeenLastCalledWith(.55);
    stopAllSounds();expect(getPlayingVoice()).toBeNull();expect(sound.stop).toHaveBeenCalled();
    setAudioSetting("voices",80);
  });
  it("does not request voices for a hidden document or unknown character",()=>{
    const count=mocks.sounds.length;
    playCharacterVoice("missing");
    Object.defineProperty(document,"hidden",{configurable:true,value:true});
    playCharacterVoice("cast-michelle");
    expect(mocks.sounds).toHaveLength(count);
  });
});
