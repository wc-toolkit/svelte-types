/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateSvelteTypes } from "./type-generator";
import type { SvelteTypesOptions } from "./types";
import type { Plugin } from "@wc-toolkit/cem-generator";
import type { Package } from "custom-elements-manifest";

/**
 * Plugin to generate Svelte types for web components based on a custom elements manifest.
 *
 * @param options - Configuration options for the Svelte types plugin
 */
export function customElementSveltePlugin(options: SvelteTypesOptions = {}) {
  return {
    name: "@wc-toolkit/svelte-types",
    packageLinkPhase({ customElementsManifest }: any) {
      generateSvelteTypes(cloneManifest(customElementsManifest), options);
    },
  };
}

/** Plugin for @wc-toolkit/cem-generator that generates Svelte types from the finalized CEM. */
export function svelteTypesGeneratorPlugin(
  options: SvelteTypesOptions = {},
): Plugin {
  return {
    name: "@wc-toolkit/svelte-types:cem-generator",
    afterGenerate(manifest: Package) {
      generateSvelteTypes(cloneManifest(manifest), options);
    },
  };
}

function cloneManifest(manifest: unknown): Package {
  return structuredClone(manifest) as Package;
}
