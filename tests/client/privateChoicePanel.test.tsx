import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrivateChoicePanel } from "../../src/ui/organisms/PrivateChoicePanel";


vi.mock("../../src/ui/organisms/CharacterNominationModal", () => ({
  CharacterNominationModal: ({ eligibleCharacterIds, onSelect, onConfirm }: { eligibleCharacterIds: string[]; onSelect(id: string): void; onConfirm(): void }) => <div role="dialog">{eligibleCharacterIds.map(id => <button key={id} onClick={() => onSelect(id)}>{id}</button>)}<button onClick={onConfirm}>Confirm nominee</button></div>,
}));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const fuelChoice = { id: "private-fuel-1", kind: "fuel-discovery" as const, deadlineAt: Date.now() + 15_000 };
const motorboat = {
  node: "launch" as const,
  discovered: true,
  hull: "sound" as const,
  engine: "fragile" as const,
  fuelAvailability: "known-private" as const,
  warningLevel: 1 as const,
  missCount: 1,
  completion: "active" as const,
};

describe("private motorboat choice", () => {
  it("keeps the finder anonymous to other viewers and explains the safe timeout", () => {
    render(<PrivateChoicePanel choice={fuelChoice} />);
    const heading = screen.getByRole("heading", { name: "Someone found the motorboat’s sealed fuel can." });
    expect(heading).toBeVisible();
    expect(screen.getByText("Waiting for the finder. If they do not answer, the fuel will be shared with camp.")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(heading.closest("section")).toHaveFocus();
  });

  it("requires a living transfer target and sends only the selected private response", () => {
    const onRespond = vi.fn();
    render(<PrivateChoicePanel
      choice={fuelChoice}
      viewerChoice={{ canRespond: true, optionIds: ["share", "hide", "transfer"], transferableTargetCharacterIds: ["cast-samantha", "cast-tim"] }}
      characterNames={{ "cast-samantha": "Samantha", "cast-tim": "Tim" }}
      onRespond={onRespond}
    />);
    const transfer = screen.getByRole("button", { name: "Give it privately" });
    expect(transfer).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Choose a living character to receive the fuel" }));
    fireEvent.click(screen.getByRole("button", { name: "cast-samantha" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm nominee" }));
    expect(transfer).toBeEnabled();
    fireEvent.click(transfer);
    expect(onRespond).toHaveBeenCalledWith("transfer", "cast-samantha");
    expect(screen.getByText("Private choice received. Waiting for the island to resolve it.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Share it with camp" })).toBeDisabled();
  });

  it("shows only server-authorized custodian actions and qualitative solo risk", () => {
    render(<PrivateChoicePanel
      choice={{ id: "launch-1", kind: "launch-custodian", deadlineAt: Date.now() + 15_000, publicActorCharacterId: "cast-daniel" }}
      viewerChoice={{ canRespond: true, optionIds: ["wake", "solo", "quiet"] }}
      actorName="Daniel"
      motorboat={motorboat}
    />);
    expect(screen.getByRole("heading", { name: "Daniel has the last good tide." })).toBeVisible();
    expect(screen.getByRole("button", { name: "Wake the group" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Leave alone now" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Keep quiet and let the tide pass" })).toBeVisible();
    expect(screen.getByText("Risky solo launch")).toBeVisible();
    expect(screen.getByText("Fragile engine")).toBeVisible();
    expect(screen.getByText("1 safe tide has already been missed")).toBeVisible();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("shows the public custodian but no controls, risk, or hidden ownership to nonactors", () => {
    render(<PrivateChoicePanel
      choice={{ id: "launch-1", kind: "launch-custodian", deadlineAt: Date.now() + 15_000, publicActorCharacterId: "cast-daniel" }}
      actorName="Daniel"
      motorboat={motorboat}
    />);
    expect(screen.getByText("Waiting for Daniel. If they do not answer, the group will be awakened.")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Launch risk")).not.toBeInTheDocument();
    expect(screen.queryByText(/owner|holder/i)).not.toBeInTheDocument();
  });

  it("closes controls at the server-estimated deadline", async () => {
    vi.useFakeTimers();
    render(<PrivateChoicePanel choice={{ ...fuelChoice, deadlineAt: Date.now() + 1_000 }} viewerChoice={{ canRespond: true, optionIds: ["share", "hide"] }} />);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(screen.getByRole("button", { name: "Share it with camp" })).toBeDisabled();
    expect(screen.getByText("Choice window closed. The safe default is being resolved.")).toBeVisible();
  });
});
