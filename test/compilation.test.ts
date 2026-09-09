import { describe, expect, it } from "vitest";
import { generateSvelteTypes } from "../src/type-generator";

describe("generated Svelte declarations", () => {
  it("include the Svelte intrinsic element namespace", () => {
    const template = generateSvelteTypes(
      {
        schemaVersion: "1.0.0",
        readme: "",
        modules: [
          {
            kind: "javascript-module",
            path: "src/button.ts",
            declarations: [
              {
                kind: "class",
                name: "Button",
                tagName: "x-button",
                customElement: true,
              },
            ],
          },
        ],
      },
      { fileName: undefined },
    );

    expect(template).toContain(
      "interface IntrinsicElements extends CustomElements",
    );
    expect(template).toContain("export type CustomElements");
  });
});
