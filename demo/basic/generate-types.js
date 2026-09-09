import { generateSvelteTypes } from "../../dist/index.js";
import manifest from "./shoelace-cem.json" with { type: "json" };

const types = generateSvelteTypes(manifest, {
  outdir: "./demo/basic/types",
  fileName: "custom-elements-svelte.d.ts",
  tagFormatter: (tagName) => tagName.replace("sl-", "wa-"),
  includeDefaultDOMEvents: true,
  componentDescriptionOptions: {
    descriptionSrc: "summary",
  },
});

// eslint-disable-next-line no-undef
console.log(types);
