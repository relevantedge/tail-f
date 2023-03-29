import { Array, Object, undefined, nil, F, listen, window } from ".";

export type ValueOrDefault<T, R, D = undefined> = T extends null | undefined
  ? D
  : R;

export const err = (code: string | null, args?: any, error?: Error): void =>
  discard(
    window["console"].error(
      ...filter([code ?? error?.message ?? error ?? "error", args, error])
    )
  );

export const unwrap = <T, C>(value: T | ((ctx: C) => T), context?: any) =>
  is(FUNCTION, value) ? (value as any)(context) : value;

export const ifNotDefault = <T, R = T>(
  value: T,
  action?: (value: T) => R
): R | undefined =>
  (typeof value === "object" && Object.keys(value as any).length) || value
    ? action
      ? action(value)
      : value
    : (undefined as any);

export const round = (x: number, decimals: number | boolean = 0) =>
  (is(BOOLEAN, decimals) ? --(decimals as any) : decimals) < 0
    ? x
    : ((decimals = Math.pow(10, decimals as any)),
      Math.round(x * decimals) / decimals);

export const map = <T, P = T>(
  value: T | Iterable<T> | null | undefined,
  projection: (item: T, index: number) => P = (item) => item as any
): P[] => (value == null ? [] : array(value).map(projection));

export const flatMap = <T, P = T>(
  value: (T | Iterable<T> | null | undefined)[],
  projection: (item: T, index: number) => P = (item) => item as any
): P[] => array(value).flatMap(projection);

export const filter = <T>(
  value: T | Iterable<T> | null | undefined,
  predicate: (item: T, index: number) => boolean = (item) =>
    item != (nil as any)
): T[] => (value == null ? [] : array(value).filter(predicate));

export const any = <T>(
  value: T | Iterable<T> | null | undefined,
  predicate: (item: T, index: number) => boolean = (item) =>
    item != (nil as any)
): boolean => filter(value, predicate).length > 0;

export const getOrSet = <K, V>(map: Map<K, V>, key: K, defaultValue: V) =>
  use(
    map.get(key),
    (value) => (value != null || map.set(key, (value = defaultValue)), value)
  );

export const splice = <T>(
  value: T[] | null | undefined,
  start: number,
  deleteCount = 0,
  values: T | Iterable<T> | null | undefined
): T[] =>
  value == nil
    ? nil
    : (value.splice(start, deleteCount!, ...array(values)) as any);

export const sort = <T>(items: T[], sortKey: (item: T) => number) => (
  items.sort((lhs, rhs) => sortKey(lhs) - sortKey(rhs)), items
);

export const push = <T extends { push(...args: any): any }>(
  target: T,
  ...values: T["push"] extends (...args: infer A) => any ? A : never
): T => (target?.push(...values), target);

export const decode = decodeURIComponent;
export const parseParameters = (
  query?: string
): Record<string, string[]> | undefined =>
  !query
    ? undefined
    : use(
        {} as Record<string, string[]>,
        (ps) => (
          query?.replace(
            /([^&=]+)(=([^&]+))?/g,
            (all, name, valuePart, value) => (
              push(
                (ps[decode(name).toLowerCase()] ??= []),
                decode(value ?? "")
              ),
              ""
            )
          ),
          ps
        )
      );

export const addOrRemove = <T>(
  items: T[],
  item: T,
  remove?: ((current: T) => boolean) | null
): T[] => (remove ? items.filter(remove) : (push(items, item), items));

export const isIterable = (value: any): value is Iterable<any> =>
  !!value?.[Symbol.iterator];

export const tryCatch = <T>(
  action: () => T,
  errors: ((e: any) => void) | any[] | false = (e) => err(null, null, e),
  finallyCallback?: () => void
): T | undefined => {
  const unbind = listen(window, "error", (ev) => ev.stopImmediatePropagation());
  try {
    return action();
  } catch (e) {
    errors !== F &&
      (is(FUNCTION, errors)
        ? errors(e)
        : push(errors, e) ?? err(null, null, e));
  } finally {
    unbind();
    finallyCallback?.();
  }
};

export const isArray = <T = any>(value: any): value is T[] =>
  value != null && Array.isArray(value);
export const isEmptyArray = (value: any) => isArray(value) && !value.length;

export const hasProperty = <T = any>(
  command: any,
  name: string
): command is T => command?.[name] !== undefined;

export const equals = <T>(value: T | null | undefined, ...options: T[]) =>
  value != null && options.includes(value);

export const use = <A extends any[], R>(
  ...args: [...A, (...values: A) => R]
): R => args[args.length - 1](...args);

export const parseParameterValue = (value: string): string | number | boolean =>
  use(+value, (n) =>
    isNaN(n) ? (equals(value, "true", "false") ? value === "true" : value) : n
  );

export const distinct = <T extends any[]>(values: T) => array(new Set(values));

export const tryUse = <T, R, D = undefined>(
  value: T,
  action: (value: NonNullable<T>) => R,
  defaultValue?: D
): ValueOrDefault<T, R, D> =>
  value != nil ? (action(value) as any) : defaultValue;

export const discard = <T = undefined>(value: any, result?: T): T => result!;

export const STRING = 0,
  BOOLEAN = 1,
  NUMBER = 2,
  FUNCTION = 3,
  OBJECT = 4;
const typePrefixes = ["s", "b", "n", "f", "o"];
export const is = <T extends number>(
  type: T,
  value: any
): value is T extends typeof STRING
  ? string
  : T extends typeof BOOLEAN
  ? boolean
  : T extends typeof NUMBER
  ? number
  : T extends typeof FUNCTION
  ? (...args: any) => any
  : T extends typeof OBJECT
  ? object
  : never => typePrefixes[type] === (typeof value)[0];

export const entries = <K extends keyof any, V>(
  value: Record<K, V>
): [K, V][] => Object.entries(value) as any;

export const project = <K extends keyof any, V, KP extends keyof any, VP>(
  source: Record<K, V>,
  projection: (kv: [K, V], index: number) => [KP, VP] | null
): Record<KP, VP> =>
  Object.fromEntries(filter(map(entries(source), projection)) as any) as any;

export const array = <T>(value: Iterable<T> | T | null | undefined): T[] =>
  value == nil
    ? []
    : Array.from((!is(STRING, value) && value[Symbol.iterator]?.()) || [value]);

export const assign = <T extends {}, P extends Record<keyof any, any>>(
  target: T,
  values: P
) => Object.assign(target, values);
