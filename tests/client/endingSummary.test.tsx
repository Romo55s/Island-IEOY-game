import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EndingSummary } from "../../src/ui/organisms/EndingSummary";

afterEach(cleanup);

describe("ending summary", () => {
  it.each([
    ["group-escape", "They actually escaped together"],
    ["solo-escape", "One seat, zero shame"],
    ["no-survivors", "The island wins on a technicality"],
  ] as const)("shows the authoritative route ending %s", (endingId, title) => {
    render(<EndingSummary endingId={endingId} survivors={2} ghosts={1} onReturn={() => undefined} />);
    expect(screen.getByRole("heading", { name: title })).toBeVisible();
    expect(screen.getByText("2 survivors")).toBeVisible();
    expect(screen.getByText("1 ghost consultant")).toBeVisible();
  });

  it("fades to a factual solo epilogue without contradicting escaped, stranded, or dead characters", () => {
    render(<EndingSummary
      endingId="solo-escape"
      survivors={3}
      ghosts={1}
      escapeResult={{
        type: "solo-escape",
        escapedCharacterIds: ["cast-daniel"],
        strandedCharacterIds: ["cast-samantha", "cast-tim"],
        deadCharacterIds: ["cast-tony"],
        cause: "solo-launch",
        epilogueId: "motorboat-selfish-aftermath-v1",
      }}
      characterNames={{ "cast-daniel": "Daniel", "cast-samantha": "Samantha", "cast-tim": "Tim", "cast-tony": "Tony" }}
      onReturn={() => undefined}
    />);
    expect(screen.getByText("Daniel")).toBeVisible();
    expect(screen.getByText("Samantha, Tim")).toBeVisible();
    expect(screen.getByText("Tony")).toBeVisible();
    expect(screen.getByText(/sole escapee sold the story/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "One seat, zero shame" })).toHaveFocus();
  });

  it("lets the player return from the completed run", () => {
    const onReturn = vi.fn();
    render(<EndingSummary endingId="group-escape" survivors={1} ghosts={0} onReturn={onReturn} />);
    fireEvent.click(screen.getByRole("button", { name: "Return to shore" }));
    expect(onReturn).toHaveBeenCalledOnce();
  });
});
