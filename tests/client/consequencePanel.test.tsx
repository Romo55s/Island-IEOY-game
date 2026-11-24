import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { EventEntry } from "../../src/shared/domain";
import { ConsequencePanel } from "../../src/ui/organisms/ConsequencePanel";

afterEach(cleanup);

describe("decision consequence report", () => {
  it("renders the selected action, vote results, exact deltas, and named status changes from one event", () => {
    const event: EventEntry = {
      id: "storm-1", createdAt: 1, text: "Compact log.", decisionId: "storm", winningOptionId: "patch", outcomeId: "roof-holds", socialCue: "danger",
      resolution: {
        decisionId: "storm", prompt: "Patch the roof?", winningOptionId: "patch", winningOptionLabel: "Patch it with luggage", outcomeId: "roof-holds", outcomeText: "The roof holds. Daniel does not.",
        optionResults: [{ optionId: "patch", label: "Patch it with luggage", votes: 3 }, { optionId: "dance", label: "Dance in the rain", votes: 1 }],
        resourceChanges: [
          { scope: "crew", resource: "shelter", before: 95, after: 100, delta: 5, cause: "outcome" },
          { scope: "character", characterId: "cast-daniel", resource: "health", before: 5, after: 0, delta: -5, cause: "starvation" },
        ],
        statusChanges: [{ characterId: "cast-daniel", before: "alive", after: "ghost", cause: "starvation" }],
        affectedCharacterIds: ["cast-daniel"], presentationCue: "danger",
      },
    };

    render(<ConsequencePanel event={event} characterNames={{ "cast-daniel": "Daniel" }} />);
    expect(screen.getByRole("heading", { name: "The crew chose “Patch it with luggage.”" })).toBeInTheDocument();
    expect(screen.getByText("The roof holds. Daniel does not.")).toBeInTheDocument();
    const voteList = screen.getByRole("heading", { name: "Vote results" }).parentElement!;
    expect(within(voteList).getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Crew · Shelter 95 → 100 (+5, consequence)")).toBeInTheDocument();
    expect(screen.getByText("Daniel · Health 5 → 0 (-5, starvation)")).toBeInTheDocument();
    expect(screen.getByText("Daniel became a ghost (starvation).")).toBeInTheDocument();
  });

  it("keeps old prose-only history readable", () => {
    render(<ConsequencePanel event={{ id: "old", createdAt: 1, text: "An older incident survived migration." }} />);
    expect(screen.getByText("An older incident survived migration.")).toBeInTheDocument();
  });

  it.each([
    ["accepted", "Daniel accepted the assignment to enter the humming cave."],
    ["timeout-accepted", "Daniel did not answer in time and accepted the assignment to enter the humming cave."],
    ["refusal-succeeded", "Daniel successfully refused the assignment to enter the humming cave."],
    ["refusal-failed", "Daniel tried to refuse, failed, and was forced to enter the humming cave."],
    ["actor-unavailable", "Daniel could no longer take the assignment to enter the humming cave, so the crew faced the fallback consequence."],
  ] as const)("renders the public %s assignment result from the resolved event", (result, expected) => {
    const event: EventEntry = {
      id: `assignment-${result}`,
      createdAt: 1,
      text: "Compact log.",
      resolution: {
        decisionId: "cave",
        prompt: "The cave hums.",
        winningOptionId: "send",
        winningOptionLabel: "Send one volunteer",
        outcomeId: "cave-result",
        outcomeText: "The cave files a strongly worded complaint.",
        optionResults: [{ optionId: "send", label: "Send one volunteer", votes: 3 }],
        resourceChanges: [],
        statusChanges: [],
        affectedCharacterIds: ["cast-daniel"],
        presentationCue: "setback",
        assignment: {
          id: "assignment-1",
          actorCharacterId: "cast-daniel",
          roleLabel: "enter the humming cave",
          selectionMethod: "group-nomination",
          result,
        },
      },
    };

    render(<ConsequencePanel event={event} characterNames={{ "cast-daniel": "Daniel" }} />);
    expect(screen.getByText(expected)).toBeVisible();
  });

  it("renders authoritative repair, passengers, fuel use, miss, and warning facts", () => {
    const event: EventEntry = {
      id: "launch-failure-2",
      createdAt: 2,
      text: "The launch failed.",
      resolution: {
        decisionId: "motorboat-group-launch",
        prompt: "Launch together?",
        winningOptionId: "launch",
        winningOptionLabel: "Launch together now",
        outcomeId: "launch-failed",
        outcomeText: "The crew achieves six meters of freedom and one extremely public return to shore.",
        optionResults: [{ optionId: "launch", label: "Launch together now", votes: 5 }],
        resourceChanges: [],
        statusChanges: [],
        affectedCharacterIds: ["cast-daniel", "cast-samantha"],
        presentationCue: "setback",
        motorboat: {
          node: "launch",
          boatChange: "launch-failed",
          opportunityId: "tide-2",
          passengerCharacterIds: ["cast-daniel", "cast-samantha"],
          missNumber: 2,
          fuelConsumed: true,
        },
      },
    };
    render(<ConsequencePanel event={event} characterNames={{ "cast-daniel": "Daniel", "cast-samantha": "Samantha" }} />);
    expect(screen.getByText("The launch failed and the motorboat was beached again.")).toBeVisible();
    expect(screen.getByText("Actual passengers: Daniel, Samantha.")).toBeVisible();
    expect(screen.getByText("One fuel charge was consumed.")).toBeVisible();
    expect(screen.getByText("Escape opportunity tide-2 was genuinely missed. Storm warning is now 2 of 3.")).toBeVisible();
  });

  it("labels storm-surge deaths without falling back to an unrelated cause", () => {
    const event: EventEntry = {
      id: "storm",
      createdAt: 3,
      text: "The storm arrived.",
      resolution: {
        decisionId: "motorboat-terminal",
        prompt: "The third tide is gone.",
        winningOptionId: "storm",
        winningOptionLabel: "Storm surge",
        outcomeId: "storm-surge",
        outcomeText: "The island closes the meeting with water.",
        optionResults: [{ optionId: "storm", label: "Storm surge", votes: 0 }],
        resourceChanges: [],
        statusChanges: [{ characterId: "cast-daniel", before: "alive", after: "ghost", cause: "storm-surge" }],
        affectedCharacterIds: ["cast-daniel"],
        presentationCue: "danger",
        motorboat: { node: "terminal", boatChange: "storm-destroyed", missNumber: 3, endingCause: "storm-surge" },
      },
    };
    render(<ConsequencePanel event={event} characterNames={{ "cast-daniel": "Daniel" }} />);
    expect(screen.getByText("Daniel became a ghost (storm surge).")).toBeVisible();
    expect(screen.getByText("The third missed opportunity ended in the storm surge.")).toBeVisible();
  });

  it("renders replay-safe motorboat facts from a private-choice event without a group resolution", () => {
    render(<ConsequencePanel event={{
      id: "private-fuel-share",
      createdAt: 4,
      text: "The finder shared the sealed can with camp.",
      motorboat: { node: "fuel-choice", boatChange: "fuel-shared" },
    }} />);
    expect(screen.getByRole("heading", { name: "The island responded." })).toBeVisible();
    expect(screen.getByText("The fuel was shared with camp.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Vote results" })).not.toBeInTheDocument();
  });
});
