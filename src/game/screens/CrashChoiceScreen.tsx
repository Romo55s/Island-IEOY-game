import type { GameConnection } from "../../client/useGameConnection";
import { useGameStore } from "../../client/useGameStore";
import { CrashChoicePanel } from "../../ui/organisms/CrashChoicePanel";

/** Connects the authoritative snapshot to the reusable DOM choice/report surface. */
export function CrashChoiceScreen({ connection, layout = "default" }: { connection: Pick<GameConnection, "sendCommand">; layout?: "default" | "story" }) {
  const snapshot = useGameStore((state) => state.snapshot);
  const serverClockOffsetMs = useGameStore((state) => state.serverClockOffsetMs);
  if (!snapshot || !["crashItemChoice", "crashRescueChoice", "crashResolution"].includes(snapshot.phase)) return null;
  const viewerCharacterId = snapshot.players.find(({ id }) => id === snapshot.viewer.playerId)?.characterId ?? null;
  return <CrashChoicePanel
    phase={snapshot.phase as "crashItemChoice" | "crashRescueChoice" | "crashResolution"}
    deadline={snapshot.phaseDeadlineAt}
    serverClockOffsetMs={serverClockOffsetMs}
    itemOffer={snapshot.crashItemOffer}
    selectedItemId={snapshot.viewerCrashChoices?.selectedItemId}
    selectedTargetCharacterId={snapshot.viewerCrashChoices?.selectedTargetCharacterId}
    viewerCharacterId={viewerCharacterId}
    players={snapshot.players}
    characters={snapshot.characters}
    characterCatalog={snapshot.characterCatalog}
    resolution={snapshot.crashResolution}
    onSubmitItem={(itemId) => connection.sendCommand({ type: "crash.item.submit", payload: { itemId } })}
    onSubmitRescue={(targetCharacterId) => connection.sendCommand({ type: "crash.rescue.submit", payload: { targetCharacterId } })}
    layout={layout}
  />;
}
