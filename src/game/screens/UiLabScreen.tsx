import { useState } from "react";
import type { EndingId, EventEntry, Player, PublicDecision } from "../../shared/domain";
import { ResourceMeter } from "../../ui/atoms/ResourceMeter";
import { StatusBadge } from "../../ui/atoms/StatusBadge";
import { ConnectionBanner } from "../../ui/molecules/ConnectionBanner";
import { SessionCode } from "../../ui/molecules/SessionCode";
import { CharacterSelector } from "../../ui/organisms/CharacterSelector";
import { CharacterPortraitCanvasLayer } from "../../ui/atoms/CharacterModelPortrait";
import { ConsequencePanel } from "../../ui/organisms/ConsequencePanel";
import { DecisionConsole } from "../../ui/organisms/DecisionConsole";
import { EndingSummary } from "../../ui/organisms/EndingSummary";
import { LobbyRoster } from "../../ui/organisms/LobbyRoster";
import { SettingsDrawer } from "../../ui/organisms/SettingsDrawer";
import styles from "./UiLabScreen.module.css";

const players: Player[] = [
  { id: "p_ana", displayName: "Ana María With A Comically Long Name", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 1 },
  { id: "p_bo", displayName: "Bo", status: "ghost", characterId: "cast-samantha", ready: true, connected: true, joinedAt: 2 },
  { id: "p_cy", displayName: "Cy", status: "alive", characterId: "cast-jim-young", ready: false, connected: false, joinedAt: 3 },
  { id: "p_dee", displayName: "Dee", status: "alive", characterId: "cast-esther-morgan", ready: true, connected: true, joinedAt: 4 },
  { id: "p_eli", displayName: "Eli", status: "alive", characterId: "cast-tim", ready: true, connected: true, joinedAt: 5 },
  { id: "p_fox", displayName: "Fox", status: "alive", characterId: "cast-tony", ready: true, connected: true, joinedAt: 6 },
  { id: "p_gus", displayName: "Gus", status: "alive", characterId: "cast-michelle", ready: true, connected: true, joinedAt: 7 },
  { id: "p_hal", displayName: "Hal", status: "alive", characterId: "cast-jacob-ramirez", ready: true, connected: true, joinedAt: 8 },
];
const decision: PublicDecision = { id: "wreckage-lighter", prompt: "The wreckage is shifting. You can save exactly one extremely important thing.", options: [{ id: "lighter", label: "Pocket the lighter" }, { id: "kit", label: "Rescue the first-aid kit" }, { id: "snacks", label: "Drag out the suspicious snack cart" }] };
const labEvent: EventEntry = {
  id: "lighter-incident", createdAt: 1, text: "The lighter worked. Briefly.", decisionId: decision.id, winningOptionId: "lighter", outcomeId: "polyester-fire", socialCue: "setback",
  resolution: {
    decisionId: decision.id, prompt: decision.prompt, winningOptionId: "lighter", winningOptionLabel: "Pocket the lighter", outcomeId: "polyester-fire",
    outcomeText: "The campfire catches. So does one seat cover, which was apparently the most flammable member of the crew.",
    optionResults: decision.options.map((option, index) => ({ optionId: option.id, label: option.label, votes: [5, 2, 1][index]! })),
    resourceChanges: [
      { scope: "character", characterId: "cast-daniel", resource: "morale", before: 65, after: 73, delta: 8, cause: "outcome" },
      { scope: "character", characterId: "cast-daniel", resource: "food", before: 50, after: 40, delta: -10, cause: "daily-consumption" },
      { scope: "crew", resource: "shelter", before: 42, after: 38, delta: -4, cause: "outcome" },
    ],
    statusChanges: [], affectedCharacterIds: ["cast-daniel"], presentationCue: "setback",
  },
};

export function UiLabScreen() {
  const [characterId, setCharacterId] = useState("cast-daniel");
  const [vote, setVote] = useState<string>();
  return <main className={styles.lab}><header className={styles.labHeader}><div><h1 className={styles.labTitle}>Black-box interface lab</h1><p className={styles.labIntro}>A damaged safety card, an unreliable crew, and the controls needed to make one more terrible group decision.</p></div><SessionCode code="CRSH42" /></header><div className={styles.deck}><div className={styles.column}><section><p className={styles.sectionLabel}>Roster stress test</p><LobbyRoster players={players} /></section><section><p className={styles.sectionLabel}>Character claims</p><CharacterSelector selectedId={characterId} claimedIds={["cast-samantha", "cast-jim-young"]} onSelect={setCharacterId} /></section><SettingsDrawer /></div><div className={styles.column}><div className={styles.instrument}><ResourceMeter label="Food" value={0} /><ResourceMeter label="Health" value={81} /><ResourceMeter label="Morale" value={100} /><ResourceMeter label="Shelter" value={38} /><StatusBadge tone="warning">Host</StatusBadge></div><ConnectionBanner state="reconnecting" /><section className={styles.heroZone} aria-label="Decision overlay playfield test"><DecisionConsole decision={decision} deadline={Date.now() + 15_000} selectedId={vote} submitted={Boolean(vote)} onVote={setVote} /></section><ConsequencePanel event={labEvent} characterNames={{ "cast-daniel": "Daniel" }} /><p className={styles.error} role="alert">That survivor is already claimed. Pick someone else.</p><EndingSummary curtain={false} endingId={"group-escape" satisfies EndingId} survivors={6} ghosts={2} onReturn={() => undefined} /></div></div><CharacterPortraitCanvasLayer /></main>;
}
