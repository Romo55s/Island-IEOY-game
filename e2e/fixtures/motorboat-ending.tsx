import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource/silkscreen/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "../../src/styles/reset.css";
import "../../src/styles/tokens.css";
import "../../src/styles/global.css";
import { EndingSummary } from "../../src/ui/organisms/EndingSummary";
import type { EscapeResult } from "../../src/shared/domain";

const characterNames = {
  "cast-daniel": "Daniel",
  "cast-samantha": "Samantha",
  "cast-jim-young": "Jim Young",
  "cast-esther-morgan": "Esther Morgan",
  "cast-tim": "Tim",
  "cast-tony": "Tony",
  "cast-michelle": "Michelle",
  "cast-jacob-ramirez": "Jacob Ramirez",
};

const livingCharacterIds = [
  "cast-daniel",
  "cast-samantha",
  "cast-jim-young",
  "cast-esther-morgan",
  "cast-tim",
  "cast-tony",
  "cast-michelle",
];

const endings = {
  "group-escape": {
    type: "group-escape",
    escapedCharacterIds: livingCharacterIds,
    strandedCharacterIds: [],
    deadCharacterIds: ["cast-jacob-ramirez"],
    cause: "group-launch",
    epilogueId: "motorboat-group-aftermath-v1",
  },
  "solo-escape": {
    type: "solo-escape",
    escapedCharacterIds: ["cast-daniel"],
    strandedCharacterIds: livingCharacterIds.slice(1),
    deadCharacterIds: ["cast-jacob-ramirez"],
    cause: "solo-launch",
    epilogueId: "motorboat-selfish-aftermath-v1",
  },
} satisfies Record<"group-escape" | "solo-escape", EscapeResult>;

const requestedEnding = new URLSearchParams(window.location.search).get("ending");
const endingId = requestedEnding === "solo-escape" ? "solo-escape" : "group-escape";
const escapeResult = endings[endingId];
const root = document.getElementById("root");

if (!root) throw new Error("Missing #root mount element");

createRoot(root).render(
  <StrictMode>
    <EndingSummary
      endingId={endingId}
      survivors={livingCharacterIds.length}
      ghosts={1}
      escapeResult={escapeResult}
      characterNames={characterNames}
      onReturn={() => document.body.setAttribute("data-returned", "true")}
    />
  </StrictMode>,
);
