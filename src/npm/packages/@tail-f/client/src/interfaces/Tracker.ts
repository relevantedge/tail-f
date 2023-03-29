import type { TrackerCommand } from "..";

export type Tracker = {
  push: {
    (...args: (TrackerCommand | TrackerCommand[])[]): void;
  };
  name: string;
  asyncNavigation: boolean;
  initialize?: () => void;
};
