import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect, type ReactNode } from "react";

vi.mock("../../src/scene/GameCanvas", () => ({
  GameCanvas: ({ children, onCreated }: { children: ReactNode; onCreated: () => void }) => {
    function MockCanvas() {
      useEffect(() => { onCreated(); }, []);
      return <div data-testid="island-canvas">{children}</div>;
    }
    return <MockCanvas />;
  },
}));
vi.mock("../../src/scene/phases/IslandScene", () => ({
  IslandScene: ({ crew }: { crew: string[] }) => <div data-testid="crew-count">{crew.length} crew slots staged</div>,
}));

import { IslandSandboxScreen } from "../../src/game/screens/IslandSandboxScreen";

afterEach(cleanup);

describe("island sandbox", () => {
  it("presents the island playfield, named crew status, shared shelter, and view hints", () => {
    render(<IslandSandboxScreen title="Island of Extremely Questionable Judgment" />);
    expect(screen.getByTestId("island-canvas")).toBeInTheDocument();
    expect(screen.getByText("8 crew slots staged")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Crew status" })).toBeInTheDocument();
    expect(screen.getByText("Daniel")).toBeInTheDocument();
    expect(screen.getByText("SHARED · SHELTER")).toBeInTheDocument();
    expect(screen.getByText("Left-drag orbit · right-drag pan · wheel zoom · WASD / arrows move")).toBeInTheDocument();
  });

  it("can remount the scene from the HUD", () => {
    render(<IslandSandboxScreen title="Test island" />);
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(screen.getByTestId("island-canvas")).toBeInTheDocument();
  });
});
