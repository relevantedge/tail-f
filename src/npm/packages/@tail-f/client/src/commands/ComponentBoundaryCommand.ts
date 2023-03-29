import type { Component } from "@tail-f/types";
import { commandTest } from "./shared";

/**
 * Registers an element as the boundary for a component. All events triggered from the element or its descendants will have this information attached.
 * In case of nested boundaries the closest one is used.
 */
export interface ComponentBoundaryCommand {
  component: Component | null;
  boundary: Element;
}

export const isComponentCommand =
  commandTest<ComponentBoundaryCommand>("component");
