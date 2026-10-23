import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssignmentResponsePanel } from "../../src/ui/organisms/AssignmentResponsePanel";
import { DecisionConsole } from "../../src/ui/organisms/DecisionConsole";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const assignment = {
  id: "assignment-1",
  actorCharacterId: "cast-daniel",
  roleLabel: "enter the humming cave",
  deadlineAt: Date.now() + 15_000,
};

describe("assignment response panel", () => {
  it("gives only the assigned viewer descriptive accept and refusal controls", () => {
    const onRespond = vi.fn();
    render(<AssignmentResponsePanel assignment={assignment} actorName="Daniel" viewerAssignment={{ canRespond: true, qualitativeRisk: "risky" }} onRespond={onRespond} />);

    const heading = screen.getByRole("heading", { name: "The crew assigned Daniel to enter the humming cave." });
    expect(heading).toBeVisible();
    expect(heading.closest("section")).toHaveFocus();
    expect(screen.getByText("Refusing looks risky. If it fails, you still have to do the job.")).toBeVisible();
    expect(screen.getByText("No response before the clock closes means you accept.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Take the job" }));
    expect(onRespond).toHaveBeenLastCalledWith("accept");
    expect(screen.getByText(/Response received: take the job/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Take the job" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Try to refuse" })).toBeDisabled();
  });

  it("submits one refusal attempt and marks the response as received", () => {
    const onRespond = vi.fn();
    render(<AssignmentResponsePanel assignment={assignment} actorName="Daniel" viewerAssignment={{ canRespond: true, qualitativeRisk: "risky" }} onRespond={onRespond} />);
    fireEvent.click(screen.getByRole("button", { name: "Try to refuse" }));
    expect(onRespond).toHaveBeenLastCalledWith("try-refuse");
    expect(screen.getByText(/Waiting for the island to resolve it/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Try to refuse" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows nonactors only the public assignment and waiting state", () => {
    render(<AssignmentResponsePanel assignment={assignment} actorName="Daniel" />);
    expect(screen.getByText("Waiting for Daniel to answer. If they do not respond, they accept the assignment.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Take the job" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try to refuse" })).not.toBeInTheDocument();
    expect(screen.queryByText(/looks risky/i)).not.toBeInTheDocument();
  });

  it("closes the response controls at the server-estimated deadline", async () => {
    vi.useFakeTimers();
    const deadlineAt = Date.now() + 1_000;
    render(<AssignmentResponsePanel assignment={{ ...assignment, deadlineAt }} actorName="Daniel" viewerAssignment={{ canRespond: true, qualitativeRisk: "uncertain" }} />);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(screen.getByRole("button", { name: "Take the job" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Try to refuse" })).toBeDisabled();
    expect(screen.getByText("Response window closed. The island is resolving what happened.")).toBeVisible();
  });
});

describe("assignment nomination", () => {
  it("requires an eligible living-character nomination before submitting an assigned option", () => {
    const onVote = vi.fn();
    render(<DecisionConsole
      decision={{
        id: "cave",
        prompt: "Who enters?",
        options: [
          { id: "send", label: "Send one volunteer", assignment: { roleLabel: "enter the humming cave", eligibleCharacterIds: ["cast-daniel", "cast-samantha"] } },
          { id: "leave", label: "Leave it alone" },
        ],
      }}
      deadline={Date.now() + 20_000}
      characterNames={{ "cast-daniel": "Daniel", "cast-samantha": "Samantha" }}
      onVote={onVote}
    />);

    const assignedOption = screen.getByRole("button", { name: /Send one volunteer/i });
    expect(assignedOption).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Nominate survivor for Send one volunteer" }), { target: { value: "cast-samantha" } });
    expect(assignedOption).toBeEnabled();
    fireEvent.click(assignedOption);
    expect(onVote).toHaveBeenCalledWith("send", "cast-samantha");
  });
});
