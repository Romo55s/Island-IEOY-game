import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResourceMeter } from "../../src/ui/atoms/ResourceMeter";
import { VoteOption } from "../../src/ui/molecules/VoteOption";
import { DecisionConsole } from "../../src/ui/organisms/DecisionConsole";
import { UiLabScreen } from "../../src/game/screens/UiLabScreen";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("UI Lab", () => {
  it("exposes labeled meters, controls, and state text", () => {
    render(<UiLabScreen />);
    const food = screen.getByRole("meter", { name: "Food" });
    expect(food).toHaveAttribute("aria-valuemin", "0");
    expect(food).toHaveAttribute("aria-valuemax", "100");
    expect(food).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("slider", { name: "Master volume" })).toHaveValue("70");
    expect(screen.getByRole("button", { name: /Samantha.*Claimed/i })).toBeDisabled();
    expect(screen.getByText("Signal lost. Reconnecting…")).toBeVisible();
  });

  it("does not communicate vote states with color alone", () => {
    render(<VoteOption index={2} label="Questionable option" selected submitted rejected />);
    const option = screen.getByRole("button", { name: /Questionable option/i });
    expect(option).toHaveAttribute("aria-pressed", "true");
    expect(option).toHaveAttribute("data-option", "2");
    expect(screen.getByText("Rejected")).toBeVisible();
  });

  it("keeps all three vote choices identifiable by their persistent number", () => {
    render(<DecisionConsole decision={{ id: "d", prompt: "Choose", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }] }} deadline={Date.now() + 20_000} />);
    const choices = screen.getAllByRole("button");
    expect(choices.map((choice) => choice.getAttribute("data-option"))).toEqual(["1", "2", "3"]);
    expect(choices.every((choice) => choice.getAttribute("aria-pressed") === "false")).toBe(true);
  });

  it("supports number-key voting only for present options", () => {
    const onVote = vi.fn();
    render(<DecisionConsole decision={{ id: "d", prompt: "Choose", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] }} deadline={Date.now() + 20_000} onVote={onVote} />);
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "3" });
    expect(onVote).toHaveBeenCalledTimes(1);
    expect(onVote).toHaveBeenCalledWith("b");
  });

  it("keeps votes disabled until the server's voting-open time", async () => {
    vi.useFakeTimers();
    const opensAt = Date.now() + 1_000;
    const onVote = vi.fn();
    render(<DecisionConsole decision={{ id: "d", prompt: "Choose", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }] }} deadline={opensAt + 5_000} votingOpensAt={opensAt} onVote={onVote} />);
    const option = screen.getByRole("button", { name: /A/i });
    expect(option).toBeDisabled();
    expect(screen.getByText("Voting opens")).toBeVisible();
    fireEvent.keyDown(window, { key: "1" });
    expect(onVote).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_100);
    expect(option).toBeEnabled();
    expect(screen.getByText("Vote clock")).toBeVisible();
  });

  it("clamps resource meter semantics", () => {
    render(<ResourceMeter label="Health" value={108} />);
    expect(screen.getByRole("meter", { name: "Health" })).toHaveAttribute("aria-valuenow", "100");
  });
});
