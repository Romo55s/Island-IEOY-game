import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { CHARACTER_CATALOG, type PublicGameSnapshot } from "../../src/shared/domain";

vi.mock("../../src/scene/GameCanvas", () => ({
  GameCanvas: ({ children, directed, target }: { children: ReactNode; directed: boolean; target: number[] }) =>
    <div data-testid="camera" data-directed={String(directed)} data-target={target.join(",")}>{children}</div>,
}));
vi.mock("../../src/scene/phases/IslandScene", () => ({
  IslandScene: ({ staging, zoneId }: { staging: string; zoneId: string }) => <div data-testid="stage" data-mode={staging} data-zone={zoneId} />,
}));
import { SessionIslandView } from "../../src/game/screens/SessionIslandView";

afterEach(cleanup);

it("moves the directed live camera and encounter staging together without free-camera instructions", () => {
  const state: PublicGameSnapshot = {
    code: "ABC234", revision: 1, phase: "decision", hostPlayerId: "host", phaseStartedAt: 0,
    phaseDeadlineAt: 30000, votingOpensAt: 25000, earliestResolveAt: 26000, phaseEndsAt: 30000,
    players: [], characters: [], characterCatalog: CHARACTER_CATALOG, resources: { shelter: 50 },
    currentDecision: { id: "distress-flare", prompt: "Flare", options: [] },
    decisionNumber: 1, totalDecisions: 10, eligibleVoterIds: [], eventHistory: [], viewer: { playerId: "host", hasVoted: false },
  };
  const { rerender } = render(<SessionIslandView snapshot={state} />);
  expect(screen.getByTestId("camera")).toHaveAttribute("data-directed", "true");
  expect(screen.getByTestId("stage")).toHaveAttribute("data-mode", "encounter");
  expect(screen.getByTestId("stage")).toHaveAttribute("data-zone", "rocky_coast");
  const previousTarget = screen.getByTestId("camera").getAttribute("data-target");
  rerender(<SessionIslandView snapshot={{ ...state, currentDecision: { id: "cave-of-bad-ideas", prompt: "Cave", options: [] } }} />);
  expect(screen.getByTestId("stage")).toHaveAttribute("data-zone", "mountain_foothills");
  expect(screen.getByTestId("camera").getAttribute("data-target")).not.toBe(previousTarget);
  expect(screen.queryByText(/drag to look around/)).not.toBeInTheDocument();
});

it("keeps free camera inspection opt-in for development surfaces", () => {
  const state: PublicGameSnapshot = {
    code: "ABC234", revision: 1, phase: "decision", hostPlayerId: "host", phaseStartedAt: 0,
    phaseDeadlineAt: 30000, votingOpensAt: 25000, earliestResolveAt: 26000, phaseEndsAt: 30000,
    players: [], characters: [], characterCatalog: CHARACTER_CATALOG, resources: { shelter: 50 },
    currentDecision: { id: "distress-flare", prompt: "Flare", options: [] },
    decisionNumber: 1, totalDecisions: 10, eligibleVoterIds: [], eventHistory: [], viewer: { playerId: "host", hasVoted: false },
  };
  render(<SessionIslandView snapshot={state} freeCamera />);
  expect(screen.getByTestId("camera")).toHaveAttribute("data-directed", "false");
  expect(screen.getByText(/drag orbit.*WASD/i)).toBeVisible();
});

it("can occupy an immersive viewport without changing the mounted scene", () => {
  const state: PublicGameSnapshot = {
    code: "ABC234", revision: 1, phase: "decision", hostPlayerId: "host", phaseStartedAt: 0,
    phaseDeadlineAt: 30000, votingOpensAt: 25000, earliestResolveAt: 26000, phaseEndsAt: 30000,
    players: [], characters: [], characterCatalog: CHARACTER_CATALOG, resources: { shelter: 50 },
    currentDecision: { id: "distress-flare", prompt: "Flare", options: [] }, decisionNumber: 1, totalDecisions: 10, eligibleVoterIds: [], eventHistory: [], viewer: { playerId: "host", hasVoted: false },
  };
  render(<SessionIslandView snapshot={state} immersive />);
  expect(screen.getByLabelText("Live island and crew")).toHaveAttribute("data-immersive", "true");
  expect(screen.getByTestId("camera")).toBeInTheDocument();
});

it("keeps detailed crew resources behind the crew report instead of covering the scene", () => {
  const state: PublicGameSnapshot = {
    code: "ABC234", revision: 1, phase: "decision", hostPlayerId: "host", phaseStartedAt: 0,
    phaseDeadlineAt: 30000, votingOpensAt: 25000, earliestResolveAt: 26000, phaseEndsAt: 30000,
    players: [{ id: "host", displayName: "Pilot", characterId: "cast-daniel", status: "alive", ready: true, connected: true, joinedAt: 0 }],
    characters: [{ characterId: "cast-daniel", status: "alive", resources: { health: 83, food: 20, water: 70, morale: 60 } }], characterCatalog: CHARACTER_CATALOG, resources: { shelter: 50 },
    currentDecision: { id: "distress-flare", prompt: "Flare", options: [] }, decisionNumber: 1, totalDecisions: 1, eligibleVoterIds: ["host"], eventHistory: [], viewer: { playerId: "host", hasVoted: false },
  };
  render(<SessionIslandView snapshot={state} />);
  expect(screen.queryByText(/HP 83/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /crew report/i }));
  expect(screen.getByLabelText("Crew condition report")).toHaveTextContent("Daniel");
  expect(screen.getByText(/HP 83/)).toBeVisible();
});
