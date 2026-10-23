import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "@fontsource/silkscreen/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/global.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root mount element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
