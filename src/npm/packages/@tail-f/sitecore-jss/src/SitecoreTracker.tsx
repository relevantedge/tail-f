import {
  ComponentRendering,
  LayoutServiceData,
  PlaceholdersData,
  SitecoreContext,
} from "@sitecore-jss/sitecore-jss-nextjs";
import { config, Tracker as TrackerType } from "@tail-f/client/external";
config.vars = "?usr";

import {
  Tracker,
  useTrackerState as useReactTrackerState,
} from "@tail-f/react";

import React, { PropsWithChildren } from "react";

export type ComponentState = {
  uid: string;
  placeholder: string;
  component: ComponentRendering;
  updates: number;
  parent: ComponentState | null;
};

export const useTrackerState = () => useReactTrackerState<ComponentState>();

export type SitecoreTrackerOptions = PropsWithChildren<{}>;
export const SitecoreTracker = ({ children }: SitecoreTrackerOptions) => {
  let layoutData: LayoutServiceData | undefined;
  let componentMap: Record<string, ComponentState> | undefined;
  return (
    <Tracker
      mapState={(el, state: ComponentState, tracker) => {
        if (typeof el.type === "string") {
          // Ignore nested DOM elements. We only want to wire the immediate children of Sitecore components.
          return null;
        }

        if (el.type === SitecoreContext) {
          layoutData = el.props.layoutData;

          buildComponentMap(layoutData?.sitecore.route?.placeholders, null);

          const route = layoutData?.sitecore?.route;
          tracker.push({
            set: {
              view: route?.itemId
                ? {
                    id: route.itemId,
                    name: route.name,
                    language: route.itemLanguage,
                    version: "" + route.itemVersion,
                  }
                : null,
            },
          });

          return null;
        }

        if (componentMap) {
          const renderingUid = el.props.rendering?.uid;
          if (renderingUid) {
            return componentMap[renderingUid];
          }
        }

        return typeof el.type === "string" ? null : state;
      }}
      patchProperties={(el, parentState, currentState, tracker) => {
        // !ssr &&
        //   console.log("Also patch", el.type.name ?? el.type, parentState);
        if (typeof el.type === "string" && parentState) {
          return { ref: getRef(parentState, tracker) };
        }
      }}
      componentRefreshed={(type, state, props) => {
        return state && ++state.updates;
      }}
    >
      {children}
    </Tracker>
  );

  function getRef(state: ComponentState, tracker: TrackerType) {
    let current: HTMLElement | null = null;
    return (el: HTMLElement | null) => {
      if (el === current) return;

      if (current != null) {
        tracker.push({ component: null, boundary: current });
      }

      if ((current = el) != null) {
        tracker.push({
          component: {
            instanceId: state.uid,
            id: state.component.componentName,
            name: state.component.componentName,
            dataSource: state.component.dataSource
              ? { id: state.component.dataSource }
              : undefined,
            params: state.component.params,
            placholder: state.placeholder,
          },
          boundary: current,
        });
      }
    };
  }

  function buildComponentMap(
    placeholders: PlaceholdersData | undefined,
    parent: ComponentState | null
  ) {
    if (!placeholders) return;

    for (const [placeholder, layout] of Object.entries(placeholders)) {
      for (const rendering of layout) {
        if ("componentName" in rendering) {
          if (!rendering.uid) continue;
          buildComponentMap(
            rendering.placeholders,
            ((componentMap ??= {})[rendering.uid] = {
              uid: rendering.uid,
              placeholder: parent?.placeholder
                ? `${parent.placeholder}/${placeholder}`
                : placeholder,
              component: rendering,
              parent,
              updates: 0,
            })
          );
        }
      }
    }
  }
};
