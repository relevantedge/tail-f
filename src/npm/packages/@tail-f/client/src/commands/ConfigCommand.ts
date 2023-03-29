import type { TrackerConfiguration } from "..";
import { commandTest } from "./shared";

export type ConfigCommand = {
  config: TrackerConfiguration;
};
export const isConfigCommand = commandTest<ConfigCommand>("config");
