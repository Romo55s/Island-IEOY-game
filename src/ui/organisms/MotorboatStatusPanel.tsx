import { useId } from "react";
import type { PublicMotorboatRouteState, QualitativeRisk } from "../../shared/domain";
import styles from "./organisms.module.css";

const nodeLabels: Record<PublicMotorboatRouteState["node"], string> = {
  discovery: "Boat discovered",
  "fuel-choice": "Fuel decision",
  repair: "Repair the engine",
  launch: "Last good tide",
  terminal: "Storm surge",
  complete: "Route complete",
};

const warningCopy = [
  "Dark weather is forming offshore.",
  "One safe tide is gone. Two remain.",
  "This is the last safe tide. The storm surge arrives before another.",
] as const;

function fuelLabel(status: PublicMotorboatRouteState): string {
  if (status.fuelAvailability === "none") return "No usable fuel";
  if (status.fuelAvailability === "known-private") return "Fuel exists · privately held";
  return status.fuelCharges === undefined ? "Fuel shared with camp" : `Fuel shared · ${status.fuelCharges} ${status.fuelCharges === 1 ? "launch" : "launches"} left`;
}

export function deriveLaunchRisk(status: PublicMotorboatRouteState, mode: "group" | "solo"): { level: QualitativeRisk; reasons: string[] } | undefined {
  if (status.engine !== "sturdy" && status.engine !== "fragile") return undefined;
  // The approved tense curve deliberately has no "favorable" motorboat
  // launch. Cooperation remains safer in the reasons and server odds, but a
  // fresh sturdy boat is still uncertain rather than a promise of escape.
  const level: QualitativeRisk = status.engine === "sturdy" && status.missCount === 0 ? "uncertain" : "risky";
  return {
    level,
    reasons: [
      `${status.engine === "sturdy" ? "Sturdy" : "Fragile"} engine`,
      mode === "group" ? "The crew can navigate, bail, and stabilize the boat" : "One person must launch and navigate alone",
      status.missCount === 0 ? "No safe tides have been missed" : `${status.missCount} safe ${status.missCount === 1 ? "tide has" : "tides have"} already been missed`,
    ],
  };
}

export function MotorboatStatusPanel({ status, launchMode }: { status: PublicMotorboatRouteState; launchMode?: "group" | "solo" }) {
  const headingId = useId();
  const launchRisk = launchMode ? deriveLaunchRisk(status, launchMode) : undefined;
  return <section className={styles.motorboatStatus} aria-labelledby={headingId}>
    <div><span className={styles.motorboatEyebrow}>Motorboat route</span><strong id={headingId}>{nodeLabels[status.node]}</strong></div>
    <dl>
      <div><dt>Hull</dt><dd>{status.hull}</dd></div>
      <div><dt>Engine</dt><dd>{status.engine}</dd></div>
      <div><dt>Fuel</dt><dd>{fuelLabel(status)}</dd></div>
      <div><dt>Misses</dt><dd>{status.missCount}/3</dd></div>
    </dl>
    <p className={styles.stormWarning} data-level={status.warningLevel}>{warningCopy[status.warningLevel]}</p>
    {launchRisk && <p className={styles.launchRisk}><strong>{launchRisk.level} {launchMode} launch:</strong> {launchRisk.reasons.join(" · ")}</p>}
  </section>;
}
