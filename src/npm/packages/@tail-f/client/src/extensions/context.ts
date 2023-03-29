import {
  isViewEvent,
  LocalID,
  Timestamp,
  UserAgentEvent,
  validateEvent,
  ViewEvent,
} from "@tail-f/types";
import { addDependency, TrackerExtensionFactory } from "..";
import {
  document,
  F,
  filter,
  isInternalUrl,
  listen,
  localId,
  location,
  map,
  matchExHash,
  nil,
  now,
  parseDomain,
  parseParameters,
  performance,
  project,
  push,
  scrollPos,
  T,
  timeout,
  timer,
  tryUse,
  undefined,
  use,
  useStorage,
  window,
} from "../lib";
import { enqueueAction, noopAction as NO_OP } from "./enqueueAction";

type TabInfo = [
  id: LocalID,
  created: Timestamp,
  navigated: Timestamp,
  views: number
];

let currentViewEvent: ViewEvent | null = null;

type ReferringViewData = [
  viewId: LocalID,
  relatedEventId: LocalID | null,
  expires: Timestamp
];

const REF_TIMEOUT = 10 * 1000;

const clearRefQueue = () =>
  useStorage<ReferringViewData[]>(
    "ref",
    (current) => filter(current, (item) => item[2] > now()),
    T
  );

// Note: we can not be 100 % sure that queue order is maintained if the user rapidly opens more than one new tab and the site is slow.
export const pushReferringViewId = (
  relatedEventId: LocalID | null,
  replace = false
) => {
  let replaced = false;
  useStorage<ReferringViewData[]>(
    "ref",
    (current) =>
      use([currentViewEvent!.id, relatedEventId, now() + REF_TIMEOUT], (item) =>
        replace
          ? map(current, (other) =>
              other[0] === item[0] && other[1] === item[1]
                ? ((replaced = true), item)
                : (other as any)
            )
          : push(current ?? [], item as any)
      ),
    T
  );

  timeout(clearRefQueue, REF_TIMEOUT + 100);
  return replaced;
};

export const getViewPort = () =>
  use(scrollPos(T), (scroll) => ({
    viewPort: {
      ...scroll,
      w: window.innerWidth,
      h: window.innerHeight,
    },
  }));

const tabChannel = new BroadcastChannel("tabs");

export const context: TrackerExtensionFactory = {
  id: "context",
  setup(tracker) {
    let isNewTab = T;

    const totalDuration = timer();
    const visibleDuration = timer();
    const interactiveDuration = timer();
    let activations = 1;

    const tab = useStorage<TabInfo>(
      "t",
      (current) => {
        if ((isNewTab = !current)) {
          return [localId(), now(), now(), 0];
        }
        current[2] = now();
        return current;
      },
      F
    );
    listen(tabChannel, "message", (msg) => {
      if (msg.data.who === currentViewEvent?.id) {
        tabChannel.postMessage({ view: getViewContext() });
      } else if (msg.data.ping) {
        tabChannel.postMessage({ pong: msg.data.ping });
      }
    });

    const getViewContext = () =>
      currentViewEvent?.id
        ? {
            id: currentViewEvent.id,
            duration: {
              activations,
              total: totalDuration(),
              visible: visibleDuration(),
              interactive: interactiveDuration(),
            },
          }
        : undefined;

    let pendingViewEvent = NO_OP;
    let pendingViewEndEvent = NO_OP;

    let currentLocation: string | null = nil;
    const postView = (force = false) => {
      if (
        matchExHash(currentLocation ?? "", (currentLocation = location.href)) &&
        !force
      ) {
        return;
      }

      pendingViewEvent();
      pendingViewEndEvent();

      totalDuration.reset();
      visibleDuration.reset();
      interactiveDuration.reset();

      useStorage<TabInfo>(
        "t",
        () => {
          tab[2] = now();
          ++tab[3];
          return tab;
        },
        F
      );

      currentViewEvent = {
        type: "VIEW",
        timestamp: now(),
        id: localId(),
        tab: tab[0],
        href: location.href,
        path: location.pathname,
        hash: location.hash || undefined,
        domain: parseDomain(location.href),
        tabIndex: tab[3] - 1,
        ...getViewPort(),
      };

      if (tab[3] === 1 && !isInternalUrl(document.referrer)) {
        currentViewEvent.firstTab = true;
        const ping = localId();
        listen(tabChannel, "message", (msg, unsubscribe) => {
          if (msg.data?.pong === ping) {
            delete currentViewEvent?.firstTab;
            unsubscribe();
          }
        });
        tabChannel.postMessage({ ping });
      }

      // Query string
      const trySplit = (s: string, sep: string) =>
        use(s.split(sep), (vs) => (vs.length > 1 ? vs : nil));

      tryUse(parseParameters(location.href?.replace(/^[^?]*\??/, "")), (ps) => {
        currentViewEvent!.query = {
          source: project(ps, ([k, v]) => [k, v.join(",")]),
          parsed: project(ps, ([k, v]) => [
            k,
            v.length > 1
              ? v
              : trySplit(v[0], "|") ||
                trySplit(v[0], ";") ||
                trySplit(v[0], ",") ||
                v,
          ]),
        };
      });

      // Navigation type
      tryUse(performance, (performance) =>
        map(
          performance.getEntriesByType("navigation"),
          (entry: PerformanceNavigationTiming) => {
            currentViewEvent!.redirects = entry.redirectCount;
            currentViewEvent!.navigationType = entry.type;
          }
        )
      );

      if ((currentViewEvent.navigationType ??= "navigate") === "navigate") {
        // Try find related event and parent tab context if any.
        // And only if navigating (not back/forward/refresh)
        clearRefQueue();
        useStorage<ReferringViewData[]>(
          "ref",
          (current) => {
            const item = current?.shift();
            if (item && isInternalUrl(document.referrer)) {
              if (isNewTab) {
                // Check if we can figure out who sent us through gossip.
                listen(tabChannel, "message", (msg, unsubscribe) => {
                  if (msg.data?.view?.id === item[0]) {
                    currentViewEvent!.view = msg.data.view;
                    unsubscribe();
                  }
                });
                tabChannel.postMessage({ who: item[0] });
              }
              currentViewEvent!.related = item[1] ?? undefined;
            }
          },
          T
        );
      }

      // Referrer
      tryUse(
        document.referrer || null,
        (referrer) =>
          !isInternalUrl(referrer) &&
          (currentViewEvent!.externalReferrer = {
            href: referrer,
            domain: parseDomain(referrer),
          })
      );

      pendingViewEvent = enqueueAction(() => push(tracker, currentViewEvent));
      pendingViewEndEvent = enqueueAction(() => {
        push(tracker, { type: "VIEW_END" }, "flush", {
          set: { view: undefined },
        });
        isNewTab = false;
      });
      push(tracker, {
        get: {
          rendered: (value) => {
            push(tracker, {
              get: {
                view: (view) => {
                  currentViewEvent!.definition = view;
                  // Allow some extra time for gossiping to figure out if we are the only tab.
                  timeout(pendingViewEvent, 100);
                },
              },
              timeout: 500,
            });
          },
        },
      });

      if (tab[3] === 1) {
        push(
          tracker,
          validateEvent<UserAgentEvent>({
            type: "USER_AGENT",
            hasTouch: navigator.maxTouchPoints > 0,
            userAgent: navigator.userAgent,
            language: {
              primary: navigator.language,
              all: navigator.languages as string[],
            },
            timezone: {
              iana: Intl.DateTimeFormat().resolvedOptions().timeZone,
              offset: new Date().getTimezoneOffset(),
            },
            screen: tryUse(screen, (s) => ({
              dpr: window.devicePixelRatio,
              w: s.width,
              h: s.height,
              landscape: s.orientation.type.startsWith("landscape") !== false,
            })),
          })
        );
      }
    };

    const interactiveTimeout = timeout();
    listen(document, ["pointermove", "scroll", "keydown"], () => {
      interactiveDuration(T);
      interactiveTimeout(() => interactiveDuration(F), 1000);
    });

    listen(document, "visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        visibleDuration(F);
        interactiveDuration(F);
      } else {
        visibleDuration(T);
        ++activations;
      }
    });

    postView();
    listen(window, "popstate", () => postView());
    map(["push", "replace"], (name) => {
      const inner = history[(name += "State")];
      history[name] = (...args: any) => {
        inner.apply(history, args);
        postView();
      };
    });

    return {
      decorate(event) {
        if (!currentViewEvent || isViewEvent(event)) return;

        event.view = getViewContext();

        addDependency(event, currentViewEvent);
      },
    };
  },
};
