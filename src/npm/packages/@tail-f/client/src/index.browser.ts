import { setupTracker } from ".";
import { components, context, navigation, scroll } from "./extensions";
import { map } from "./lib";

const tracker = setupTracker(
  map([context, components, navigation, scroll], (extension) => ({
    extension,
  }))
);

tracker.initialize!();
