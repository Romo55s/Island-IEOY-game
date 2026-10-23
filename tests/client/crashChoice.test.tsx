import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CharacterState, Player } from "../../src/shared/domain";
import { CHARACTER_CATALOG } from "../../src/shared/domain";
import type { PrivateRoomState } from "../../src/shared/domain";
import { toPublicSnapshot } from "../../src/shared/protocol";
import { useGameStore } from "../../src/client/useGameStore";
import { CrashChoicePanel } from "../../src/ui/organisms/CrashChoicePanel";
import { CrashChoiceScreen } from "../../src/game/screens/CrashChoiceScreen";

afterEach(() => { cleanup(); useGameStore.getState().reset(); });

const players: Player[] = [
  { id: "p_tony", displayName: "Tony", status: "alive", characterId: "cast-tony", ready: true, connected: true, joinedAt: 1 },
  { id: "p_daniel", displayName: "Daniel", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 2 },
];
const characters: CharacterState[] = players.map(({ characterId }) => ({ characterId: characterId!, status: "alive", resources: { food: 50, health: 100, morale: 65, water: 50 } }));

describe("crash choice UI", () => {
  it("presents exactly the viewer's three items and submits a replacement selection", () => {
    const onSubmitItem = vi.fn();
    render(<CrashChoicePanel phase="crashItemChoice" deadline={Date.now() + 15_000} itemOffer={["guitar", "knife", "apple"]} selectedItemId="guitar" viewerCharacterId="cast-tony" players={players} characters={characters} characterCatalog={CHARACTER_CATALOG} onSubmitItem={onSubmitItem} onSubmitRescue={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Choose one starting item" }).querySelectorAll("button")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /Guitar/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Hunting knife/ }));
    expect(onSubmitItem).toHaveBeenCalledWith("knife");
  });

  it("allows self-rescue and exposes qualitative risk", () => {
    const onSubmitRescue = vi.fn();
    render(<CrashChoicePanel phase="crashRescueChoice" deadline={Date.now() + 15_000} viewerCharacterId="cast-tony" players={players} characters={characters} characterCatalog={CHARACTER_CATALOG} onSubmitItem={vi.fn()} onSubmitRescue={onSubmitRescue} />);
    expect(screen.getByText(/moderate/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Tony.*you/ }));
    expect(onSubmitRescue).toHaveBeenCalledWith("cast-tony");
  });

  it("reveals named rescue attempts and their consequences after lock-in", () => {
    render(<CrashChoicePanel phase="crashResolution" deadline={null} viewerCharacterId="cast-tony" players={players} characters={characters} characterCatalog={CHARACTER_CATALOG} resolution={{ attempts: [{ rescuerCharacterId: "cast-tony", targetCharacterId: "cast-daniel", itemId: "guitar", outcome: "rescuer-lost", complicationText: "A dramatic mishap." }], savedCharacterIds: ["cast-daniel"], eliminatedCharacterIds: ["cast-tony"], summary: "Daniel was saved; Tony is a ghost." }} onSubmitItem={vi.fn()} onSubmitRescue={vi.fn()} />);
    expect(screen.getByRole("listitem")).toHaveTextContent("Tony tried to save Daniel");
    expect(screen.getByText("A dramatic mishap.")).toBeVisible();
    expect(screen.getByText("1 ghost")).toBeVisible();
  });

  it("sends item choices through the game connection using the viewer-private snapshot", () => {
    const state: PrivateRoomState = {
      code: "ABC234", revision: 1, phase: "crashItemChoice", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_tony", phaseStartedAt: 10,
      phaseDeadlineAt: Date.now() + 20_000, votingOpensAt: null, earliestResolveAt: null, phaseEndsAt: Date.now() + 20_000,
      players: { p_tony: players[0]! }, characters: { "cast-tony": characters[0]! }, resources: { shelter: 50 }, deck: [], decisionIndex: 0,
      currentDecisionId: null, votesByPlayer: {}, eligibleVoterIds: ["p_tony"], eventHistory: [],
      crashItemOffersByPlayer: { p_tony: ["guitar", "knife", "apple"] }, crashItemsByPlayer: {}, rescueTargetsByPlayer: {},
    };
    useGameStore.getState().acceptSnapshot(toPublicSnapshot(state, "p_tony"));
    const sendCommand = vi.fn();
    render(<CrashChoiceScreen connection={{ sendCommand }} />);
    fireEvent.click(screen.getByRole("button", { name: /Hunting knife/ }));
    expect(sendCommand).toHaveBeenCalledWith({ type: "crash.item.submit", payload: { itemId: "knife" } });
  });
});
