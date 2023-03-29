import type { Component, Rectangle } from ".";

export interface ComponentContext extends Component {
  rect?: Rectangle;
}
