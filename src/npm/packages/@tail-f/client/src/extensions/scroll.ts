import {
  isTrackerEvent,
  isViewEvent,
  ScrollEvent,
  validateEvent,
} from "@tail-f/types";
import { TrackerExtensionFactory } from "../interfaces";
import { listen, push, scrollPos, timeout, window } from "../lib";

export const scroll: TrackerExtensionFactory = {
  id: "scroll",
  setup(tracker) {
    let unbind: (() => void) | undefined;
    const watch = () => {
      unbind?.();
      if (window.scrollY > 100) {
        return;
      }
      let triggered = false;
      unbind = listen(window, "scroll", () => {
        const fold = Math.min(
          document.body.scrollHeight,
          2 * window.innerHeight
        );
        if (fold < 1.2 * window.innerHeight) {
          unbind!();
        }

        const scrollY = window.scrollY + window.innerHeight;
        if (scrollY + 50 >= fold) {
          unbind!();
          if (triggered !== (triggered = true)) {
            push(
              tracker,
              validateEvent<ScrollEvent>({
                type: "SCROLL",
                scrollType: "fold",
                offset: scrollPos(true),
              })
            );
          }
        }
      });
    };
    watch();
    tracker.push({
      listener: {
        command(ev) {
          if (isTrackerEvent(ev) && isViewEvent(ev)) {
            timeout(watch, 100);
          }
        },
      },
    });
  },
};
