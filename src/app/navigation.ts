export function navigateTo(path: string): void {
  if (typeof window === "undefined") return;
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
