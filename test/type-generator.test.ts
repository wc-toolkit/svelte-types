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

const cssOnlyManifest = {
  schemaVersion: "1.0.0",
  readme: "",
  modules: [
    {
      kind: "javascript-module",
      path: "src/styles.css",
      declarations: [
        {
          kind: "class",
          name: "Layout",
          tagName: "zd-flex",
          customElement: true,
          attributes: [{ name: "variant", type: { text: "row | column" } }],
          cssProperties: [{ name: "--badge-color" }],
          slots: [{ name: "icon" }, { name: "" }],
        },
      ],
      exports: [],
    },
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
  it("does not mutate a manifest reused for sequential generation", () => {
    const input = structuredClone(manifest);
    const before = structuredClone(input);
    const first = generateSvelteTypes(input, { fileName: undefined });
    const second = generateSvelteTypes(input, { fileName: undefined });

    expect(input).toEqual(before);
    expect(second).toBe(first);
  });

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
    expect(template).toContain("declare global {\n  namespace svelteHTML");
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

  it("generates CSS-only declarations without component imports", () => {
    const template = generateSvelteTypes(cssOnlyManifest, {
      fileName: undefined,
      globalTypePath: "styles/types",
      tagFormatter: (tag) => `lib-${tag}`,
    });

    expect(template).toContain("export type ZdFlexProps = {");
    expect(template).toContain('"variant"?: "row" | "column";');
    expect(template).toContain('"style:--badge-color"?: string | number;');
    expect(template).toContain("export type ZdFlexElement = HTMLElement;");
    expect(template).toContain('export type ZdFlexSlots = "icon" | "";');
    expect(template).toContain(
      '"lib-zd-flex": Partial<ZdFlexProps & BaseProps & BaseEvents>;',
    );
    expect(template).not.toMatch(
      /import type \{[^}]*Layout[^}]*\} from "styles\/types"/,
    );
    expect(template).not.toContain("zd-flexProps");
    expect(template).toContain(
      '"lib-x-button": Partial<ButtonProps & BaseProps & BaseEvents>;',
    );
  });

  it("respects exclude for CSS-only declarations", () => {
    const template = generateSvelteTypes(cssOnlyManifest, {
      fileName: undefined,
      exclude: ["Layout"],
    });

    expect(template).not.toContain('"zd-flex"');
    expect(template).toContain('"x-button"');
  });

  it("imports a shared event detail type only once and skips generic detail imports", () => {
    const manifest = {
      schemaVersion: "1.0.0",
      readme: "",
      modules: ["first", "second"].map((name) => ({
        kind: "javascript-module" as const,
        path: `src/${name}.ts`,
        declarations: [
          {
            kind: "class" as const,
            name: name === "first" ? "First" : "Second",
            tagName: `x-${name}`,
            customElement: true,
            events: [
              { name: "error", type: { text: "CustomEvent<ErrorDetail>" } },
              {
                name: "generic",
                type: { text: "CustomEvent<Record<string, never>>" },
              },
            ],
          },
        ],
        exports: [
          {
            kind: "js" as const,
            name: name === "first" ? "First" : "Second",
            declaration: {
              name: name === "first" ? "First" : "Second",
              module: `src/${name}.ts`,
            },
          },
        ],
      })),
    } satisfies cem.Package;

    const template = generateSvelteTypes(manifest, {
      fileName: undefined,
      outdir: "./types",
    });
    const detailImports = template
      ?.split("\n")
      .filter(
        (line) =>
          line.startsWith("import type") && line.includes("ErrorDetail"),
      );
    expect(detailImports).toHaveLength(1);
    expect(detailImports?.[0]).toContain('from "../src/first.ts"');
    expect(
      template
        ?.split("\n")
        .some(
          (line) => line.startsWith("import type") && line.includes("Record"),
        ),
    ).toBe(false);
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
