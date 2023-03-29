import { tracker } from "..";
import { listen, map, nil, push } from "../lib";

export type PendingActionHandle = (commit?: boolean) => void;

// These will be flushed when / if the user leaves the page. Pending commands are waiting to see if
const activeHandles = new Set<PendingActionHandle>();

let flushing = false;
let unbindListener: (() => void) | null = nil;

export const noopAction: PendingActionHandle = () => {};

export const enqueueAction = (
  action: (flushed: boolean) => void
): PendingActionHandle => {
  if (!unbindListener) {
    // This will disable bfcache in Firefox until they (eventually) make an update like the rest. Not an issue in Chrome and Safari. https://web.dev/bfcache/
    unbindListener = listen(window, "beforeunload", () => {
      flushing = true;
      map(activeHandles, (item) => item(true));
      push(tracker, "flush");
    });
  }

  const handler = (commit = true) => {
    if (activeHandles.delete(handler)) {
      commit && action(flushing);
      activeHandles.size === 0 && (unbindListener?.(), (unbindListener = nil));
    }
  };
  activeHandles.add(handler);

  return handler;
};
