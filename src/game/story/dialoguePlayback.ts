import type { CrewDialogueLine } from "../../shared/domain";

export interface TimedDialogueLine { line: CrewDialogueLine; characters: string[]; revealAt: number[]; start: number; end: number }
export const DIALOGUE_CHARACTER_MS = 26;
export const DIALOGUE_LINE_GAP_MS = 300;

/** Visual pacing only. No game clock, server RNG or resource state is touched. */
export function timeDialogue(lines: readonly CrewDialogueLine[], voiceDurationsMs: Readonly<Record<string, number>> = {}): TimedDialogueLine[] {
  let cursor = 0;
  return lines.map(line => {
    const start = cursor;
    const characters = Array.from(line.text);
    const weights = characters.map(character => DIALOGUE_CHARACTER_MS + (/[.!?…]/u.test(character) ? 140 : /[,;:—]/u.test(character) ? 70 : 0));
    const naturalDuration = weights.reduce((sum, weight) => sum + weight, 0);
    const duration = Math.max(naturalDuration, voiceDurationsMs[line.characterId] ?? 0);
    const scale = naturalDuration ? duration / naturalDuration : 1;
    let local = 0;
    const revealAt = weights.map(weight => {
      const time = cursor + local;
      local += weight * scale;
      return time;
    });
    const end = cursor + duration;
    cursor = end;
    cursor += DIALOGUE_LINE_GAP_MS;
    return { line, characters, revealAt, start, end };
  });
}

export function dialogueFrame(timeline: readonly TimedDialogueLine[], elapsed: number, showAll = false) {
  const activeIndex = timeline.findIndex(line => elapsed >= line.start && elapsed < line.end);
  return {
    activeIndex: showAll ? -1 : activeIndex,
    complete: showAll || elapsed >= (timeline.at(-1)?.end ?? 0),
    visibleText: timeline.map(line => showAll ? line.line.text : line.characters.slice(0, line.revealAt.filter(time => time <= elapsed).length).join("")),
  };
}
