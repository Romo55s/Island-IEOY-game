export const uiStrings = { createSession: "Create session", joinSession: "Join session", ready: "Ready", vote: "Lock in vote", reconnecting: "Reconnecting to the black box…" } as const;

export const decisionCopy = {
  "wreckage-lighter": { prompt: "The wreckage is shifting. You can save exactly one extremely important thing.", options: ["Pocket the lighter", "Rescue the first-aid kit", "Drag out the suspicious snack cart"] },
  "coconut-jury": { prompt: "Coconuts are overhead and gravity has already chosen violence.", options: ["Shake the palm", "Build a coconut catcher", "Appoint the tallest survivor as ambassador"] },
  "smoke-signal": { prompt: "A ship-shaped speck appears on the horizon. What feeds the signal fire?", options: ["Burn damp leaves", "Burn seat cushions", "Burn the retreat banner"] },
  "mystery-berries": { prompt: "A bush offers glossy purple berries and no nutrition label.", options: ["Taste one", "Feed one to the inflatable life vest", "Leave them alone"] },
  "shelter-politics": { prompt: "The weather is turning. The shelter committee has three deeply confident proposals.", options: ["Build by the beach", "Build under the cliffs", "Sleep inside the fuselage"] },
  "boar-diplomacy": { prompt: "A wild boar enters camp and immediately assumes it owns the place.", options: ["Share food", "Use intimidating office jargon", "Attempt a performance review"] },
  "rainwater-budget": { prompt: "Rain arrives. Unfortunately, so does the water-capture planning meeting.", options: ["Use bottles", "Use the emergency slide", "Declare rain an optional benefit"] },
  "distress-flare": { prompt: "You discover one distress flare and several opinions about timing.", options: ["Fire it now", "Save it for night", "Give it to the least coordinated survivor"] },
  "cave-of-bad-ideas": { prompt: "A cave hums in a way caves generally should not.", options: ["Explore together", "Send one volunteer", "Seal it with a meeting agenda"] },
  "raft-committee": { prompt: "The raft is technically a raft, according to the people who built it.", options: ["Launch immediately", "Reinforce it", "Hold one final alignment meeting"] },
} as const;
