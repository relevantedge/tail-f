import type { Component, ComponentContext } from "@tail-f/types";
import { isComponentCommand, TrackerExtensionFactory } from "..";
import {
  document,
  forAncestorsOrSelf,
  getRect,
  listen,
  timeout,
  tryUse,
  undefined,
  window,
} from "../lib";

export let COMPONENT_CONTEXT: ComponentContext | undefined = undefined;

export const components: TrackerExtensionFactory = {
  id: "components",
  setup() {
    const setContext = timeout();
    const boundaries = new WeakMap<Node, Component>();
    window["boundaries"] = boundaries;
    listen(document, ["pointerdown", "focus"], (ev) => {
      setContext.clear();
      COMPONENT_CONTEXT = undefined;
      forAncestorsOrSelf(ev.target, (el) =>
        tryUse(
          boundaries.get(el),
          (component) => (
            (COMPONENT_CONTEXT = { ...component, rect: getRect(el) }), false
          )
        )
      );
    });

    listen(document, ["pointerup", "blur"], (ev) =>
      setContext(() => (COMPONENT_CONTEXT = undefined), 10)
    );

    return {
      processCommand(cmd) {
        if (!isComponentCommand(cmd)) return false;
        const { boundary, component } = cmd;
        component
          ? boundaries.set(boundary, component)
          : boundaries.delete(boundary);

        return true;
      },
    };
  },
};
