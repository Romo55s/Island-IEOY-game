import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MotorboatStatusPanel, deriveLaunchRisk } from "../../src/ui/organisms/MotorboatStatusPanel";
import type { PublicMotorboatRouteState } from "../../src/shared/domain";

afterEach(cleanup);

const status: PublicMotorboatRouteState = {
  node: "fuel-choice",
  discovered: true,
  hull: "unknown",
  engine: "unknown",
  fuelAvailability: "known-private",
  warningLevel: 2,
  missCount: 2,
  completion: "active",
};

describe("compact motorboat status", () => {
  it("shows only public fuel facts and the authored storm warning", () => {
    render(<MotorboatStatusPanel status={status} />);
    expect(screen.getByText("Fuel decision")).toBeVisible();
    expect(screen.getByText("Fuel exists · privately held")).toBeVisible();
    expect(screen.getByText("2/3")).toBeVisible();
    expect(screen.getByText("This is the last safe tide. The storm surge arrives before another.")).toBeVisible();
    expect(screen.queryByText(/owner/i)).not.toBeInTheDocument();
  });

  it("derives descriptive group and solo risk only from public boat condition and prior misses", () => {
    const launchable = { ...status, node: "launch" as const, engine: "sturdy" as const, hull: "sound" as const, missCount: 0, warningLevel: 0 as const };
    expect(deriveLaunchRisk(launchable, "group")?.level).toBe("uncertain");
    expect(deriveLaunchRisk(launchable, "solo")?.level).toBe("uncertain");
    render(<MotorboatStatusPanel status={launchable} launchMode="group" />);
    expect(screen.getByText(/uncertain group launch/i)).toBeVisible();
    expect(screen.getByText(/crew can navigate, bail, and stabilize/i)).toBeVisible();
    expect(screen.queryByText(/80|%/)).not.toBeInTheDocument();
  });
});
