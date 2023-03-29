import { Expand, UnionToIntersection } from ".";

export function any(value: any) {
  if (typeof value !== "object") {
    return true;
  }
  for (const key in value) {
    return true;
  }
  return false;
}

function* countYields<T>(items: Iterable<T>) {
  let n = 0;
  for (const item of items) {
    yield item;
    ++n;
  }
  return n;
}

function* iterateObject<K extends keyof any, V, T extends Record<K, V>, R>(
  source: T,
  projection: (src: T, key: K) => R
): Iterable<R> {
  let i = 0;
  for (const p in source) {
    yield projection(source, p as any);
    ++i;
  }
  return i;
}

type CleanPartitions<T> = {
  [P in keyof T]: T[P] extends infer T & never[] ? T : T;
};

export function partition<T, R extends Record<keyof any, any>>(
  items: Iterable<T>,
  partition: (item: T) => R
): Expand<
  CleanPartitions<UnionToIntersection<{ [P in keyof R]: Required<R>[P][] }>>
> {
  return null as any;
}

export function keys<K extends keyof any, V>(
  source: Record<K, V>
): Iterable<K> {
  return iterateObject(source, (src, key) => key) as any;
}

export function values<K extends keyof any, V>(
  source: Record<K, V>
): Iterable<V> {
  return iterateObject(source, (src, key) => src[key]);
}

export function entries<K extends keyof any, V>(
  source: Record<K, V>
): Iterable<[K, V]> {
  return iterateObject(source, (src, key) => [key, src[key]]) as any;
}

export const isIterable = (value: any): value is Iterable<any> =>
  value[Symbol.iterator] !== void 0;

export type GroupFunction = {
  <K, V>(
    ...values: (Iterable<[K, Iterable<V | undefined>]> | undefined)[]
  ): Map<K, V[]>;
  <K, V>(...values: (Iterable<[K, V]> | undefined)[]): Map<K, V[]>;
};
export const group = (<K, V>(...values: Iterable<[K, V]>[]): Map<K, any> => {
  const groups = new Map<K, V[]>();
  for (const src of values) {
    if (src === undefined) continue;

    for (const [key, value] of src) {
      let current = groups.get(key);
      if (current === undefined) {
        groups.set(key, (current = []));
      }
      if (isIterable(value)) {
        current.push(...value);
      } else {
        current.push(value);
      }
    }
  }
  return groups;
}) as GroupFunction;

type FlatItem<T> = T extends (infer T)[] ? T : T;

type ReturnType<RT extends number, Flat extends boolean, T> = Flat extends true
  ? ReturnType<RT, false, FlatItem<T>>
  : RT extends 0
  ? T[]
  : RT extends 1
  ? Iterable<T> & { flat(): T extends (infer T)[] ? T : T }
  : void;

export type MapFunction<RT extends 0 | 1 | 2, Flat extends boolean = false> = {
  <T, P = T>(
    values: Iterable<T> | null | undefined,
    projection?: ((value: T, index: number) => undefined | P) | null
  ): ReturnType<RT, Flat, P>;
  <T extends string | number | boolean, P = T>(
    values: Iterable<T> | T | null | undefined,
    projection?: ((value: T, index: number) => undefined | P) | null
  ): ReturnType<RT, Flat, P>;
  <K extends keyof any, V, P = [K, V]>(
    values: Iterable<[K, V]> | Record<K, V> | null | undefined,
    projection?: ((value: [K, V], index: number) => undefined | P) | null
  ): ReturnType<RT, Flat, [K, V]>;
  <T, P = T>(
    values: Iterable<T> | T | null | undefined,
    projection?: ((value: T, index: number) => undefined | P) | null
  ): ReturnType<RT, Flat, P>;
};

export const flat: MapFunction<0, true> & { it: MapFunction<1, true> } =
  Object.assign((...args: any[]) => [...(flat.it as any)(...args)], {
    *it(...args: any) {
      for (const item in (map as any).it(...args)) {
        if (Array.isArray(item)) {
          yield* item;
        } else {
          yield item;
        }
      }
    },
  }) as any;

export const map: MapFunction<0> & {
  it: MapFunction<1>;
} = Object.assign((...args: any[]) => [...(map.it as any)(...args)], {
  *it(values: Iterable<any>, projection?: (value: any, index: number) => any) {
    if (!values) return 0;
    const iterable = (
      values[Symbol.iterator]
        ? values
        : typeof values === "object"
        ? Object.entries(values)
        : [values]
    ) as Iterable<any>;

    if (!projection) {
      return yield* countYields<any>(iterable);
    }

    let i = 0;
    let n = 0;

    for (const value of iterable) {
      const projected = projection(value, i++);
      if (projected === void 0) continue;
      if (Array.isArray(projected["flat"])) {
        for (const value of projected["flat"]) {
          yield value;
        }
      }

      yield projected;
      ++n;
    }
    return n;
  },
}) as any;

export const filter = merge(
  <T>(
    values: Iterable<T> | null | undefined,
    evaluate: ((value: T, index: number) => boolean) | null | undefined
  ) => [...filter.it(values, evaluate)],
  {
    *it<T>(
      values: Iterable<T> | null | undefined,
      evaluate: ((value: T, index: number) => boolean) | null | undefined
    ) {
      if (!values) {
        return 0;
      }
      if (!evaluate) {
        return yield* countYields(values);
      }

      let i = 0;
      let n = 0;
      for (const value of values) {
        if (evaluate(value, i++)) {
          ++n;
          yield value;
        }
      }
      return n;
    },
  }
);

export const forEach: MapFunction<2> = (values: any, action: any) => {
  let i = 0;
  for (const v of map.it(values)) {
    action(v, i++);
  }
};

type Join<T extends any[]> = T extends [infer T]
  ? T
  : T extends [...infer Tail, infer T]
  ? T & Join<Tail>
  : never;

export function merge<T extends any[]>(...args: T): Expand<Join<T>> {
  let target = args[0];
  for (const source of args.slice(1)) {
    for (const [key, value] of Object.entries(source)) {
      if (value === void 0) {
        delete target[key];
      } else if (typeof target[key] === "object" && typeof value === "object") {
        merge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }
  return target;
}

export function eq<T>(
  x: T | null | undefined,
  y: T | null | undefined,
  deep = false
): boolean {
  if (x == y) return true;
  if (x === null || x === undefined || y == null || y == undefined) {
    return false;
  }
  if ((typeof x === "object") !== (typeof y === "object")) {
    return false;
  }

  if (Array.isArray(x) !== Array.isArray(y)) {
    return false;
  }
  if (Array.isArray(x)) {
    return (
      x.length === y["length"] &&
      x.every((value, i) => (deep ? eq(value, y[i]) : value === y[i]))
    );
  }

  const xs = Object.entries(x);
  return (
    xs.length === Object.keys(y).length &&
    xs.every(([key, value]) => (deep ? eq(value, y[key]) : value === y[key]))
  );
}

eq.f =
  (deep = false) =>
  (x: any, y: any) =>
    eq(x, y, deep);

export const params = (
  value: string | string[] | readonly string[] | null | undefined,
  decode = true
): Record<string, string> & Record<number, [string, string]> => {
  if (!value) return {};
  let i = 0;
  return Object.fromEntries(
    flat(value, (value) =>
      value.split(";").map((line) =>
        line
          .trim()
          .split("=")
          .map((v) => (decode ? decodeURIComponent(v.trim()) : v.trim()))
      )
    ).flatMap((kv) => [kv, [i++, kv]])
  );
};

export const unparam = (
  value: Record<string, string | null | undefined> | null | undefined,
  encode = true
) => {
  if (!value) return "";
  return map(value, ([key, value]) =>
    value
      ? `${encode ? encodeURIComponent(key) : key}=${
          encode ? encodeURIComponent(value) : value
        }`
      : key
  ).join("; ");
};

export const tryParse = <T>(
  value: string | undefined,
  update: (value: T | null) => T
) => (value ? update(JSON.parse(value)) : update(null));
