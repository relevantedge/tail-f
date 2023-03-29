import type { UUID } from "@tail-f/types";
import { now } from ".";

const randomValues = (arg: any) => crypto.getRandomValues(arg);
export const uuidv4 = (): UUID =>
  (([1e7] as any) + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: number) =>
    (c ^ (randomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );

export const randomSafeInt = (arr?: Uint32Array) => (
  randomValues((arr = new Uint32Array(2))),
  // keep all 32 bits of the the first, top 20 of the second for 52 random bits
  arr[0] * (1 << 20) + (arr[1] >>> 12)
);

export const localId = () => now();
