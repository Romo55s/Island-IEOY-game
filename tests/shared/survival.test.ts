import { describe, expect, it } from "vitest";
import type { PrivateRoomState } from "../../src/shared/domain";
import { applyDailySurvival, DAILY_FOOD_CONSUMPTION, STARVATION_HEALTH_DAMAGE } from "../../src/shared/rules/survival";

function state(food: number, health = 100): PrivateRoomState {
  return {
    code: "ABC234", revision: 1, phase: "decision", createdAt: 0, lastActivityAt: 0, hostPlayerId: "p_a",
    phaseStartedAt: 0, phaseDeadlineAt: 10_000, votingOpensAt: 0, earliestResolveAt: 0, phaseEndsAt: 10_000,
    players: { p_a: { id: "p_a", displayName: "Ana", status: "alive", characterId: "cast-daniel", ready: true, connected: true, joinedAt: 0 } },
    characters: { "cast-daniel": { characterId: "cast-daniel", status: "alive", resources: { food, health, morale: 60, water: 50 } } },
    resources: { shelter: 50 }, deck: [], decisionIndex: 0, currentDecisionId: null, votesByPlayer: {}, eligibleVoterIds: ["p_a"], eventHistory: [],
  };
}

describe("daily survival", () => {
  it("consumes food without hurting health until the supply was empty at day start", () => {
    const firstDay = applyDailySurvival(state(DAILY_FOOD_CONSUMPTION));
    expect(firstDay.state.characters["cast-daniel"]?.resources).toMatchObject({ food: 0, health: 100 });
    expect(firstDay.starvedCharacterIds).toEqual([]);

    const secondDay = applyDailySurvival(firstDay.state);
    expect(secondDay.state.characters["cast-daniel"]?.resources.health).toBe(100 - STARVATION_HEALTH_DAMAGE);
    expect(secondDay.starvedCharacterIds).toEqual(["cast-daniel"]);
    expect(secondDay.starvationDamageByCharacterId).toEqual({ "cast-daniel": STARVATION_HEALTH_DAMAGE });
    expect(secondDay.state.players.p_a?.status).toBe("alive");
  });

  it("reports only the health actually removed when starvation is lethal", () => {
    const result = applyDailySurvival(state(0, 5));
    expect(result.starvationDamageByCharacterId).toEqual({ "cast-daniel": 5 });
    expect(result.state.characters["cast-daniel"]?.resources.health).toBe(0);
    expect(result.newlyGhostCharacterIds).toEqual(["cast-daniel"]);
  });

  it("turns a living survivor into a voting ghost after five full days with no food", () => {
    let current = state(0, 100);
    for (let day = 0; day < 5; day += 1) current = applyDailySurvival(current).state;
    expect(current.characters["cast-daniel"]?.status).toBe("ghost");
    expect(current.characters["cast-daniel"]?.resources.health).toBe(0);
    expect(current.players.p_a?.status).toBe("ghost");
    expect(current.eligibleVoterIds).toContain("p_a");
  });

  it("makes starvation lethal at zero health and returns the newly-dead character once", () => {
    let current = state(0, STARVATION_HEALTH_DAMAGE);
    for (let index = 0; index < 1; index += 1) {
      const result = applyDailySurvival(current);
      expect(result.newlyGhostCharacterIds).toEqual(["cast-daniel"]);
      current = result.state;
    }
    expect(current.characters["cast-daniel"]?.resources.health).toBe(0);
    expect(current.characters["cast-daniel"]?.status).toBe("ghost");
    expect(current.players.p_a?.status).toBe("ghost");
    expect(current.eligibleVoterIds).toContain("p_a");
    expect(applyDailySurvival(current).newlyGhostCharacterIds).toEqual([]);
  });

  it("keeps ghosts out of the hunger tick", () => {
    const dead = state(0, 0);
    dead.characters["cast-daniel"]!.status = "ghost";
    dead.players.p_a!.status = "ghost";
    const result = applyDailySurvival(dead);
    expect(result.state.characters["cast-daniel"]?.resources).toMatchObject({ food: 0, health: 0 });
    expect(result.starvedCharacterIds).toEqual([]);
    expect(result.newlyGhostCharacterIds).toEqual([]);
  });
});
