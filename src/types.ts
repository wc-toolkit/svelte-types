import { ComponentDescriptionOptions } from "@wc-toolkit/cem-utilities";

export type SvelteTypesOptions = {
  /** Used to get a specific path for a given component */
  componentTypePath?: (
    name: string,
    tag?: string,
    modulePath?: string,
  ) => string;
  /** Name of the file generated */
  fileName?: string;
  /** Path to output directory */
  outdir?: string;
  /** Component names to exclude form process */
  exclude?: string[];
  /** Used to get global type reference for components */
  globalTypePath?: string;
  /** Include standard DOM event handlers in every component type. */
  includeDefaultDOMEvents?: boolean;
  /** Include Svelte 5 event attributes alongside legacy `on:` handlers. */
  includeModernEventHandlers?: boolean;
  /** Used to add global element props to all component types */
  globalEvents?: string;
  /** Property name on the CEM member/attribute to read types from */
  typesSrc?: string;
  /** Optional function to format tag names before processing. */
  tagFormatter?: (tagName: string) => string;
  /** Available options for configuring the way the components description is rendered */
  componentDescriptionOptions?: ComponentDescriptionOptions;
  /** Skips the code from running */
  skip?: boolean;
  /** Shows contextual logs */
  debug?: boolean;
};
