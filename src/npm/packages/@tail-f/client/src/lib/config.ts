import { TrackerConfiguration } from "..";
import { nil } from "./alias";

export const config: Required<TrackerConfiguration> = {
  name: "tail",
  src: "/api/t.js",
  scripts: [],
  vars: nil,
  hub: "?var",
};
