import { describe, expect, it } from "vitest";
import type * as cem from "custom-elements-manifest";
import { generateSvelteTypes } from "../src/type-generator";

const manifest = {
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
          attributes: [
            { name: "label", fieldName: "label", type: { text: "string" } },
          ],
          members: [
            { kind: "field", name: "label", type: { text: "string" } },
            { kind: "field", name: "value", type: { text: "number" } },
            {
              kind: "method",
              name: "focusInput",
              parameters: [{ name: "select", type: { text: "boolean" } }],
              return: { type: { text: "void" } },
            },
          ],
          cssProperties: [
            { name: "--track-color", description: "Track color" },
          ],
          slots: [{ name: "label", description: "Button label" }],
          events: [
            { name: "change", type: { text: "CustomEvent<string>" } },
            { name: "focus", type: { text: "FocusEvent" } },
          ],
        },
      ],
      exports: [
        {
          kind: "js",
          name: "Button",
          declaration: { name: "Button", module: "src/button.ts" },
        },
      ],
    },
  ],
} satisfies cem.Package;

describe("generateSvelteTypes", () => {
  it("generates Svelte intrinsic element types", () => {
    const template = generateSvelteTypes(manifest, { fileName: undefined });

    expect(template).toContain('"label"?: string;');
    expect(template).toContain('"value"?: number;');
    expect(template).toContain('"style:--track-color"?: string | number;');
    expect(template).toContain(
      "export interface ButtonElement extends HTMLElement",
    );
    expect(template).toContain("focusInput(select: boolean): void;");
    expect(template).toContain('export type ButtonSlots = "label";');
    expect(template).toContain(
      '"on:change"?: (e: CustomEvent<string>) => void;',
    );
    expect(template).toContain(
      '"x-button": Partial<ButtonProps & BaseProps & BaseEvents>;',
    );
    expect(template).toContain("declare namespace svelteHTML");
    expect(template).not.toContain("declare module 'react'");
  });

  it("supports global type imports and tag formatting", () => {
    const template = generateSvelteTypes(manifest, {
      fileName: undefined,
      globalTypePath: "my-library/types",
      tagFormatter: (tag) => `lib-${tag}`,
    });

    expect(template).toContain(
      'import type { Button } from "my-library/types";',
    );
    expect(template).toContain('"lib-x-button"');
    expect(template).toContain("Button['label']");
    expect(template).toContain("export type ButtonElement = Button;");
  });

  it("passes the component module path and emits modern event attributes", () => {
    const template = generateSvelteTypes(manifest, {
      fileName: undefined,
      componentTypePath: (_name, _tag, modulePath) => `${modulePath}/types.js`,
    });

    expect(template).toContain(
      'import type { Button } from "src/button.ts/types.js";',
    );
    expect(template).toContain(
      '"onchange"?: (e: CustomEvent<string>) => void;',
    );
    expect(template).toContain('"on:focus"?: (e: FocusEvent) => void;');
  });

  it("includes configured global events", () => {
    const template = generateSvelteTypes(manifest, {
      fileName: undefined,
      globalEvents: '  "on:telemetry"?: (event: Event) => void;',
    });

    expect(template).toContain('"on:telemetry"?: (event: Event) => void;');
  });

  it("uses Svelte event names for default DOM events", () => {
    const template = generateSvelteTypes(manifest, {
      fileName: undefined,
      includeDefaultDOMEvents: true,
    });

    expect(template).toContain('"on:click"?: (event: MouseEvent) => void;');
    expect(template).toContain("onclick?: (event: MouseEvent) => void;");
    expect(template).not.toContain("onClick?:");
  });
});
