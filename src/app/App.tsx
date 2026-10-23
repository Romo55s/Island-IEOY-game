import { APP_NAME } from "../shared/domain";
import { UiLabScreen } from "../game/screens/UiLabScreen";
import { IslandSandboxScreen } from "../game/screens/IslandSandboxScreen";
import { CrashChoicePreview } from "../ui/organisms/CrashChoicePanel";
import { GameSessionScreen } from "../game/screens/GameSessionScreen";
import { CrewAdmissionScreen } from "../game/screens/CrewAdmissionScreen";
import { lazy, Suspense } from "react";

const EncounterPreviewScreen = import.meta.env.DEV ? lazy(() => import("../game/screens/EncounterPreviewScreen")) : null;
const MotorboatRoutePreviewScreen = import.meta.env.DEV ? lazy(() => import("../game/screens/MotorboatRoutePreviewScreen")) : null;

export function App() {
  if (EncounterPreviewScreen && window.location.pathname === "/encounter-preview") return <Suspense fallback={<p>Loading presentation preview…</p>}><EncounterPreviewScreen /></Suspense>;
  if (MotorboatRoutePreviewScreen && window.location.pathname === "/motorboat-route-preview") return <Suspense fallback={<p>Loading motorboat route preview…</p>}><MotorboatRoutePreviewScreen /></Suspense>;
  if (window.location.pathname === "/ui-lab") return <UiLabScreen />;
  if (window.location.pathname === "/crash-choice-preview") return <CrashChoicePreview />;
  if (window.location.pathname === "/sandbox") return <IslandSandboxScreen title={APP_NAME} />;
  if (window.location.pathname === "/start-crew") return <CrewAdmissionScreen mode="create" />;
  if (window.location.pathname === "/join-crew") return <CrewAdmissionScreen mode="join" />;
  return <GameSessionScreen />;
}
