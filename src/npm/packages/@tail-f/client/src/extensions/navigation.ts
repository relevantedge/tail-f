import {
  AnchorEvent,
  ComponentClickEvent,
  NavigationEvent,
  validateEvent,
} from "@tail-f/types";
import {
  COMPONENT_CONTEXT,
  getViewPort,
  pushReferringViewId,
  TrackerExtensionFactory,
} from "..";
import {
  cookie,
  document,
  equals,
  forAncestorsOrSelf,
  getPos,
  isInternalUrl,
  listen,
  localId,
  location,
  mapUrl,
  matchExHash,
  parseDomain,
  parseElementData,
  push,
  tagName,
  timeout,
  tryCatch,
  tryUse,
  use,
  window,
} from "../lib";

// MUST MATCH packages\@tail-f\engine\src\RequestHandler.ts
const CONTEXT_MENU_COOKIE = "_ctxmn";

const isLinkElement = (el: Element): el is HTMLAnchorElement =>
  tagName(el) === "A" &&
  tryUse(
    el["href"],
    (href: string) => !href.endsWith("#") && !href.startsWith("javascript:")
  );

const isClickable = (el: Element): el is HTMLElement =>
  use(
    tagName(el),
    (t) =>
      equals(t, "A", "BUTTON") ||
      (t === "INPUT" && equals(t["type"], "button", "submit"))
  );

export const navigation: TrackerExtensionFactory = {
  id: "navigation",
  setup(tracker) {
    let currentHash = "";
    const checkHash = () =>
      currentHash !== (currentHash = location.hash) &&
      push(
        tracker,
        validateEvent<AnchorEvent>({ type: "ANCHOR", anchor: location.hash })
      );

    checkHash();
    listen(window, "hashchange", checkHash);

    let pollPingBack = timeout();
    listen(document, ["click", "contextmenu", "auxclick"], (ev: MouseEvent) => {
      forAncestorsOrSelf(ev.target, (el) => {
        if (isClickable(el)) {
          if (isLinkElement(el)) {
            const navigationEvent: NavigationEvent = {
              id: localId(),
              type: "NAVIGATION",
              href: el.href,
              domain: parseDomain(el.href),
              self: true,
              component: COMPONENT_CONTEXT,
              pos: getPos(el, ev),
              anchor: el.hash,
              ...parseElementData(ev.target, 10),
              ...getViewPort(),
            };
            navigationEvent.external = el.hostname !== location.hostname;

            if (ev.type === "contextmenu") {
              pushReferringViewId(navigationEvent.id);

              const currentUrl = el.href;
              use(
                isInternalUrl(currentUrl),
                (internalUrl) => (
                  (el.href = internalUrl
                    ? currentUrl
                    : mapUrl("?mnt=", encodeURIComponent(currentUrl))),
                  !internalUrl &&
                    tryCatch(() => navigator.clipboard.writeText(currentUrl))
                )
              );

              const flag = Date.now();
              cookie(CONTEXT_MENU_COOKIE, flag);

              pollPingBack(() => {
                el.href = currentUrl;

                if (
                  !pushReferringViewId(navigationEvent.id, true) ||
                  +cookie(CONTEXT_MENU_COOKIE)! === flag + 1
                ) {
                  cookie(CONTEXT_MENU_COOKIE, "");
                  navigationEvent.self = false;
                  push(tracker, navigationEvent);
                  pollPingBack.clear();
                }
              }, -100);

              let unbindAll = listen(
                document,
                ["keydown", "keyup", "visibilitychange", "pointermove"],
                () =>
                  unbindAll() &&
                  pollPingBack.clear(10000, () =>
                    cookie(CONTEXT_MENU_COOKIE, "")
                  )
              );
            } else if (ev.button <= 1) {
              if (
                ev.button === 1 || //Middle-click: new tab.
                ev.ctrlKey || // New tab
                ev.shiftKey || // New window
                ev.altKey // Download
              ) {
                pushReferringViewId(navigationEvent.id);
                navigationEvent.self = false;
              } else if (!matchExHash(location.href, el.href)) {
                navigationEvent.exit = navigationEvent.external;
                // No "real" navigation will happen if it is only the hash changing.
                pushReferringViewId(navigationEvent.id);
              }
              push(tracker, navigationEvent);
            }
            return false;
          }

          push(
            tracker,
            validateEvent<ComponentClickEvent>({
              type: "COMPONENT_CLICK",
              pos: getPos(el, ev),
              content: el.innerText.substring(0, 100),
              component: COMPONENT_CONTEXT,
              ...parseElementData(ev.target, 10),
              ...getViewPort(),
            })
          );
        }
      });
    });
  },
};
