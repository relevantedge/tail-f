import type { ExternalReference, Personalization, Parameters } from ".";

export interface Component extends ExternalReference {
  /**
   * An additional name that defines the component. For example the name of a (p)react component.
   */
  typeName?: string;

  /**
   * A unique identifier for the specific instance of the component with its parameters and current position in the rendered element tree.
   */
  instanceId?: string;

  /**
   * An optional reference to an external source that defines what is rendered in the component.
   */
  dataSource?: ExternalReference;

  /**
   * Any parameters that controls how the component is rendered.
   */
  params?: Parameters;

  /**
   * Any personalization that caused the component to be rendered in a specific way (including if the component was hidden).
   * The key should normally match the group ID of the applied personalization.
   */
  p13n?: Record<string, Personalization>;

  /**
   * An optional name of the area in the element tree where the component is rendered. By convention this should the path of nested placeholders separated by a slash.
   */
  placholder?: string;
}
