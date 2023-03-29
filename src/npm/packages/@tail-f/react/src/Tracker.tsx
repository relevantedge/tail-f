import {
  attachTracker,
  config,
  Tracker as TrackerType,
} from "@tail-f/client/external";
import { PropsWithChildren } from "react";
import { TraverseFunctions, traverseNodes, useTraverseState } from "./traverse";

export type TrackerProperties<State = any> = PropsWithChildren<
  TraverseFunctions<State, TrackerType>
>;

attachTracker();
export const Tracker = <State,>(props: TrackerProperties<State>) => {
  globalThis[config.name].push({ set: { rendered: true } });

  return traverseNodes(props.children, {
    ...props,
    context: globalThis[config.name],
  });
};

export const useTrackerState = useTraverseState;
