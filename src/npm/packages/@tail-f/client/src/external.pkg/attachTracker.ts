import type { Tracker } from "..";
import { config } from "../lib/config";

export { config };

let tracker: Tracker;

export function attachTracker(init?: (tracker: Tracker) => void) {
  if (tracker) return;

  const key = config.name;
  tracker = globalThis[key] || ((globalThis[key] = []) as any);
  // If window is undefined we are in SSR context.
  if (typeof window === "undefined") return;

  const injectScript = () => {
    tracker.push({ config }, init);

    const src = [config.src];
    if (config.name) {
      src.push("#", config.name);
    }
    return document.head.appendChild(
      Object.assign(document.createElement("script"), {
        src: src.join(""),
        async: true,
      })
    );
  };

  document.readyState !== "loading"
    ? injectScript()
    : document.addEventListener(
        "readystatechange",
        () => document.readyState !== "loading" && injectScript()
      );
}
