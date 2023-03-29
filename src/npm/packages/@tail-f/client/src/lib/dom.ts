import type { Domain, Position, Rectangle } from "@tail-f/types";
import {
  document,
  entries,
  F,
  map,
  nil,
  push,
  round,
  T,
  tryUse,
  undefined,
  use,
  ValueOrDefault,
} from ".";

export let MAX_ANCESTOR_DISTANCE = Number.MAX_SAFE_INTEGER;

export const forAncestorsOrSelf = (
  el: Node | EventTarget | null | undefined,
  action: (el: Element) => any,
  maxDistance = MAX_ANCESTOR_DISTANCE
) => {
  let i = 0;
  while (
    i++ <= maxDistance &&
    el?.["nodeType"] === 1 &&
    action(el as Element) !== F
  )
    el = (el as Element).parentElement;
};

export const define = <T, P extends Record<keyof any, [any, boolean?]>>(
  target: T,
  props: P
): T & P =>
  use(
    {} as any,
    (ps) => (
      map(
        entries(props),
        ([name, [value, writable = false]]) =>
          (ps[name] = {
            writable,
            configurable: writable,
            value,
          })
      ),
      Object.defineProperties(target, ps)
    )
  ) as any;

export const tagName = <T extends Element | null | undefined>(
  el: T
): T extends null | undefined ? null : string =>
  el != nil ? (el.tagName as any) : null;

export const scrollPos = (int?: boolean): Position => ({
  x: round(scrollX, int),
  y: round(scrollY, int),
});

export const matchExHash = (href1: string, href2: string) =>
  href1.replace(/#.*$/, "") === href2.replace(/#.*$/, "");

export const getPos = <T extends Element | null | undefined>(
  el: T,
  mouseEvent?: MouseEvent
): ValueOrDefault<T, Position> =>
  mouseEvent?.pageY != null
    ? { x: mouseEvent.pageX, y: mouseEvent.pageY }
    : el
    ? use(getRect(el), ({ x, y }) => ({ x, y }))
    : (undefined as any);

export const getRect = <T extends Element | null | undefined>(
  el: T
): ValueOrDefault<T, Rectangle> =>
  el
    ? use(el.getBoundingClientRect(), scrollPos(F), (rect, scroll) => ({
        x: round(rect.left + scroll.x),
        y: round(rect.top + scroll.y),
        w: round(rect.width),
        h: round(rect.height),
      }))
    : (undefined as any);

export const listen = (
  el: any,
  names: string[] | string,
  cb: (event: Event & Record<string, any>, unbind: () => void) => void,
  capture = T,
  passive = T
) =>
  use(
    [] as any[],
    (unbinders) => (
      map(names, (name, i) => {
        const mapped = (ev: any) => {
          cb(ev, unbinders[i]);
        };
        push(unbinders, () => el.removeEventListener(name, mapped, capture));
        return el.addEventListener(name, mapped, { capture, passive });
      }),
      () =>
        unbinders.length > 0 && map(unbinders, (unbind) => unbind())
          ? ((unbinders = []), T)
          : F
    )
  );

export const listenOnce = (
  el: any,
  names: string[] | string,
  cb: (event: Event & Record<string, any>, unbind: () => void) => void,
  useCapture?: boolean
) =>
  listen(
    el,
    names,
    (event, unbind) => (cb(event, unbind), unbind()),
    useCapture
  );

export const cookie = <V extends any = undefined>(
  name: string,
  value?: V
): ValueOrDefault<V, void, string | null> =>
  value === undefined
    ? document.cookie.replace(
        /(?:^|;)\s*([^=]+)(?:=([^;]+))?/g,
        (all, key, value) => (key === name ? value : "")
      ) || (nil as any)
    : (document.cookie = `${name}=${value}; SameSite=Lax${
        !value ? "; Max-Age=0" : ""
      }`);

export const parseDomain = <T extends string | null | undefined>(
  href: T
): T extends string ? Domain : undefined =>
  href == null
    ? (undefined as any)
    : tryUse(href.match(/^(?:([a-z0-9]+):)?(?:\/\/)?([^\s\/:]*)/i), (match) =>
        match[2]
          ? ({
              protocol: match[1],
              domain: match[2],
            } as Domain)
          : undefined
      );
