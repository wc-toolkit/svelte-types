/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateSvelteTypes } from "./type-generator";
import type { SvelteTypesOptions } from "./types";

/**
 * Plugin to generate Svelte types for web components based on a custom elements manifest.
 *
 * @param options - Configuration options for the Svelte types plugin
 */
export function customElementSveltePlugin(options: SvelteTypesOptions = {}) {
  return {
    name: "@wc-toolkit/svelte-types",
    packageLinkPhase({ customElementsManifest }: any) {
      generateSvelteTypes(customElementsManifest, options);
    },
  };
}
