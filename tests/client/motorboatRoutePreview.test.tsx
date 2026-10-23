import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicGameSnapshot } from "../../src/shared/domain";

vi.mock("../../src/game/screens/SessionIslandView", () => ({
  SessionIslandView: ({ snapshot }: { snapshot: PublicGameSnapshot }) => <div
    data-testid="route-scene"
    data-node={snapshot.motorboat?.node}
    data-fuel={snapshot.motorboat?.fuelAvailability}
    data-misses={snapshot.motorboat?.missCount}
    data-completion={snapshot.motorboat?.completion}
  />,
}));

import MotorboatRoutePreviewScreen from "../../src/game/screens/MotorboatRoutePreviewScreen";

afterEach(cleanup);

describe("motorboat route development preview", () => {
  it("steps through the shared group route using the real public status surfaces", () => {
    render(<MotorboatRoutePreviewScreen />);
    expect(screen.getByRole("heading", { name: "Motorboat route preview" })).toBeVisible();
    expect(screen.getByText(/deterministic public snapshots/i)).toBeVisible();
    expect(screen.getByLabelText("Preview step")).toHaveTextContent("1/3 · Share fuel");
    expect(screen.getByTestId("route-scene")).toHaveAttribute("data-fuel", "shared");
    expect(screen.getByText(/Fuel shared with camp|Fuel shared · 3 launches left/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByLabelText("Preview step")).toHaveTextContent("2/3 · Sturdy repair");
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByTestId("route-scene")).toHaveAttribute("data-completion", "group-escape");
    expect(screen.getByRole("heading", { name: "They actually escaped together" })).toBeVisible();
  });

  it("switches between hidden solo, recovery, and terminal storm fixtures deterministically", () => {
    render(<MotorboatRoutePreviewScreen />);
    const select = screen.getByLabelText("Route");

    fireEvent.change(select, { target: { value: "hidden-solo" } });
    expect(screen.getByLabelText("Preview step")).toHaveTextContent("1/4 · Private fuel choice");
    expect(screen.getByTestId("route-scene")).toHaveAttribute("data-fuel", "known-private");
    expect(screen.getByRole("heading", { name: "Someone found the motorboat’s sealed fuel can." })).toBeVisible();
    expect(screen.getByRole("button", { name: "Hide it" })).toBeVisible();
    expect(screen.queryByText(/Daniel puts all three fuel/i)).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: "failed-recovery" } });
    expect(screen.getByLabelText("Preview step")).toHaveTextContent("1/3 · Failed launch");
    expect(screen.getByTestId("route-scene")).toHaveAttribute("data-misses", "1");
    expect(screen.getByText(/One safe tide is gone/i)).toBeVisible();

    fireEvent.change(select, { target: { value: "third-miss-storm" } });
    expect(screen.getByTestId("route-scene")).toHaveAttribute("data-misses", "2");
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByTestId("route-scene")).toHaveAttribute("data-completion", "no-survivors");
    expect(screen.getByRole("heading", { name: "The island wins on a technicality" })).toBeVisible();
  });
});
