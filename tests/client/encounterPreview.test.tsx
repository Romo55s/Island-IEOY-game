import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicGameSnapshot } from "../../src/shared/domain";

vi.mock("../../src/game/screens/SessionIslandView", () => ({
  SessionIslandView: ({ freeCamera, sceneLabel }: { snapshot: PublicGameSnapshot; freeCamera?: boolean; sceneLabel?: string }) => <div data-testid="encounter-scene" data-free-camera={String(Boolean(freeCamera))} data-scene-label={sceneLabel} />,
}));

import EncounterPreviewScreen from "../../src/game/screens/EncounterPreviewScreen";

afterEach(cleanup);

describe("encounter presentation preview", () => {
  it("keeps directed framing by default and exposes opt-in free camera inspection", () => {
    render(<EncounterPreviewScreen />);
    expect(screen.getByTestId("encounter-scene")).toHaveAttribute("data-free-camera", "false");
    expect(screen.getByTestId("encounter-scene")).toHaveAttribute("data-scene-label", "Encounter preview");
    expect(screen.getByText("Directed camera framing")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Enable free camera" }));
    expect(screen.getByTestId("encounter-scene")).toHaveAttribute("data-free-camera", "true");
    expect(screen.getByText("Free inspection controls active")).toBeVisible();
    expect(screen.getByRole("button", { name: "Lock directed camera" })).toHaveAttribute("aria-pressed", "true");
  });
});
