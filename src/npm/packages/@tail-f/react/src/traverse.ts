import React, { isValidElement, ReactNode } from "react";

const stateKey = "__traverse_state";

let currentHookState: any = null;

export function useTraverseState<T>(): T | undefined {
  return currentHookState;
}

type Ref = (el: HTMLElement) => void;
export type TraversableElement = JSX.Element & { ref?: Ref };

export type MapState<State = any, Context = any> = (
  el: TraversableElement,
  currentState: State | null,
  context: Context
) => State | null;

export type PatchProperties<State = any, Context = any> = (
  el: TraversableElement,
  parentState: State | null,
  currentState: State | null,
  context: Context
) => { ref?: Ref; props?: Record<string, any> } | void | false;

export type ComponentRefreshed<State = any, Context = any> = (
  type: any,
  state: State | null,
  props: Record<string, any>,
  context: Context
) => void;

export interface TraverseFunctions<T, C> {
  mapState: MapState<T, C>;
  patchProperties?: PatchProperties<T, C>;
  componentRefreshed?: ComponentRefreshed<T, C>;
}

export interface TraverseOptions<T, Context>
  extends TraverseFunctions<T, Context> {
  initialState?: T;
  context?: Context;
}

interface TraverseContext<T, C> extends TraverseFunctions<T, C> {
  state: T | null;
  node: ReactNode;
  parent: TraverseContext<T, C> | null;
  context: C;
}

const createInitialContext = <T, C = undefined>(
  node: ReactNode,
  options: TraverseOptions<T, C>
): TraverseContext<T, C> => ({
  ...options,
  state: options.initialState ?? null,
  node,
  parent: null,
  context: options.context as any,
});

export function traversing<T, C = undefined>(
  node: ReactNode,
  options: TraverseOptions<T, C>
) {
  return traversingInternal(
    node,
    createInitialContext(node, options),
    options.initialState
  )[1];
}

export function traverseNodes<T, C = undefined>(
  node: ReactNode,
  options: TraverseOptions<T, C>
) {
  return traverseNodesInternal(
    node,
    createInitialContext(node, options),
    options.initialState
  );
}

const wrapperTypeKind = Symbol("typeKind");

function traversingInternal<T, C>(
  type: any,
  context: TraverseContext<T, C>,
  state: T | null
) {
  const wrappedTypeKind = type[wrapperTypeKind];
  if (wrappedTypeKind != null) return [wrappedTypeKind, type];

  let wrapper: any;
  let typeKind = 2;
  if (type.prototype instanceof React.Component) {
    typeKind = 0;
    wrapper = class extends type {
      render() {
        return render(type, this.props, () => super.render());
      }
    };
  } else if (typeof type === "function") {
    typeKind = 1;
    wrapper = function (props: any) {
      return render(type, props, () => type(props));
    };
  }
  if (wrapper) {
    wrapper[wrapperTypeKind] = typeKind;
    Object.defineProperty(wrapper, "name", {
      value: type.name,
      enumerable: false,
    });
    return [typeKind, wrapper];
  }

  return [2, type];

  function render(type: any, props: any, inner: () => any) {
    if (state != null) {
      context.componentRefreshed?.(type, state, props, context.context);
    }
    try {
      currentHookState = state;
      return traverseNodesInternal(inner(), context, state);
    } catch (e) {
      console.error(e);
    } finally {
      currentHookState = null;
    }
  }
}

function isTraversable(el: ReactNode): el is TraversableElement {
  return isValidElement(el);
}

export function traverseNodesInternal<T, C>(
  node: ReactNode,
  context: TraverseContext<T, C>,
  state: T | null
) {
  if (Array.isArray(node)) {
    return node.map((node) => traverseNodesInternal(node, context, state));
  }

  if (!isTraversable(node)) {
    return node;
  }
  let el = node;

  const currentState = context.mapState(el, state, context.context);

  const newContext: TraverseContext<T, C> = {
    ...context,
    node,
    parent: context,
  };

  const patched = context.patchProperties?.(
    el,
    state,
    currentState,
    context.context
  );

  if (patched === false) {
    return el;
  } else if (patched) {
    const [currentRef, patchedRef] = [el["ref"], patched.ref];
    el = {
      ...el,
      props:
        patched.props && patched.props !== el.props ? patched.props : el.props,
      ref: patchedRef
        ? currentRef
          ? (el) => (patchedRef(el), currentRef(el))
          : patchedRef
        : currentRef,
    };
  }

  const [kind, type] = traversingInternal(el.type, newContext, currentState);

  switch (kind) {
    case 0: // Class component
    case 1: // Function component
      return { ...el, type };
    default:
      const children = el.props?.children;
      return children
        ? {
            ...el,
            props: {
              ...el.props,
              children:
                typeof children === "function"
                  ? (...args: any) =>
                      traverseNodesInternal(
                        children(...args),
                        newContext,
                        currentState
                      )
                  : traverseNodesInternal(children, newContext, currentState),
            },
          }
        : el;
  }
}
