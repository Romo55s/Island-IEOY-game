import { APP_NAME } from "../shared/domain";
import { UiLabScreen } from "../game/screens/UiLabScreen";
import { CrashChoicePreview } from "../ui/organisms/CrashChoicePanel";
import { GameCreditsScreen, GameSessionScreen } from "../game/screens/GameSessionScreen";
import { CrewAdmissionScreen } from "../game/screens/CrewAdmissionScreen";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { MusicMuteButton } from "../ui/atoms/MusicMuteButton";
import { requestMenuMusic } from "../audio/audioSystem";
import { navigateTo } from "./navigation";

const EncounterPreviewScreen = import.meta.env.DEV ? lazy(() => import("../game/screens/EncounterPreviewScreen")) : null;
const TeamFeedbackPreviewScreen = import.meta.env.DEV ? lazy(() => import("../game/screens/TeamFeedbackPreviewScreen")) : null;
const DecisionTestScreen = import.meta.env.DEV ? lazy(() => import("../game/screens/DecisionTestScreen")) : null;
const SoundTestScreen = lazy(() => import("../game/screens/SoundTestScreen").then(({ SoundTestScreen: Screen }) => ({ default: Screen })));
const StoryMapScreen = import.meta.env.DEV ? lazy(() => import("../game/screens/StoryMapScreen")) : null;
const MotorboatRoutePreviewScreen = import.meta.env.DEV ? lazy(() => import("../game/screens/MotorboatRoutePreviewScreen")) : null;
const DevToolsScreen = import.meta.env.DEV ? lazy(() => import("../game/screens/DevToolsScreen")) : null;
const IslandSandboxScreen = lazy(() => import("../game/screens/IslandSandboxScreen").then(({ IslandSandboxScreen: Screen }) => ({ default: Screen })));

export function App() {
  const [path, setPath] = useState(() => window.location.pathname.replace(/\/+$/u, ""));
  useEffect(() => {
    requestMenuMusic(true);
    return () => requestMenuMusic(false);
  }, []);
  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname.replace(/\/+$/u, ""));
    const handleInternalNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.hash)) return;
      event.preventDefault();
      navigateTo(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener("popstate", syncPath);
    window.addEventListener("click", handleInternalNavigation);
    return () => {
      window.removeEventListener("popstate", syncPath);
      window.removeEventListener("click", handleInternalNavigation);
    };
  }, []);
  let page: ReactNode = <GameSessionScreen />;
  if (path === "/credits") page = <GameCreditsScreen />;
  else if (DecisionTestScreen && path === "/decision-test") page = <Suspense fallback={<p>Loading decision test bench…</p>}><DecisionTestScreen /></Suspense>;
  else if (TeamFeedbackPreviewScreen && path === "/team-feedback") page = <Suspense fallback={<p>Loading feedback preview…</p>}><TeamFeedbackPreviewScreen /></Suspense>;
  else if (path === "/sound-test") page = <Suspense fallback={<p>Loading sound test bench…</p>}><SoundTestScreen /></Suspense>;
  else if (StoryMapScreen && path === "/story-map") page = <Suspense fallback={<p>Loading story map…</p>}><StoryMapScreen /></Suspense>;
  else if (EncounterPreviewScreen && path === "/encounter-preview") page = <Suspense fallback={<p>Loading presentation preview…</p>}><EncounterPreviewScreen /></Suspense>;
  else if (MotorboatRoutePreviewScreen && path === "/motorboat-route-preview") page = <Suspense fallback={<p>Loading motorboat route preview…</p>}><MotorboatRoutePreviewScreen /></Suspense>;
  else if (DevToolsScreen && path === "/dev-tools") page = <Suspense fallback={<p>Loading development tools…</p>}><DevToolsScreen /></Suspense>;
  else if (path === "/ui-lab") page = <UiLabScreen />;
  else if (path === "/crash-choice-preview") page = <CrashChoicePreview />;
  else if (path === "/sandbox") page = <Suspense fallback={<p>Loading island sandbox…</p>}><IslandSandboxScreen title={APP_NAME} /></Suspense>;
  else if (path === "/start-crew") page = <CrewAdmissionScreen mode="create" />;
  else if (path === "/join-crew") page = <CrewAdmissionScreen mode="join" />;
  return <>{page}<MusicMuteButton /></>;
}
