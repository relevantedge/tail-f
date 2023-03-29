import { Timestamp } from "@tail-f/types";
import { F, performance, T, use } from ".";
export const now = () => Math.floor(performance.timeOrigin + performance.now());

export type Timeout = {
  (callback: () => void, delay?: number): void;
  clear(delay?: number, cleanup?: () => void): void;
};

export const timeout = (callback?: () => void, delay?: number) => {
  let id = 0;

  const clear = () => (
    id < 0 ? clearInterval(-id) : clearTimeout(id), (id = 0)
  );

  const timeout = (callback: () => void, delay?: number) => {
    clear();
    id =
      delay! < 0
        ? -setInterval(callback, -delay!)
        : setTimeout(callback, delay);
  };

  timeout.clear = (delay?: number, cleanup?: () => void) =>
    id &&
    (delay
      ? use(id, (currentId) =>
          setTimeout(() => id === currentId && (clear(), cleanup?.()), delay)
        )
      : (clear(), cleanup?.()));

  return callback && timeout(callback, delay), timeout;
};

export const timer = (origin = now()) => {
  let elapsed = 0;

  const timer = (start?: boolean): Timestamp => {
    if (origin) {
      elapsed += -origin + (origin = now());
    } else if (start === T) {
      origin = now();
    }

    if (start === F) {
      origin = 0;
    }
    return elapsed;
  };
  timer.reset = () => (origin && (origin = now()), (elapsed = 0));
  return timer;
};
