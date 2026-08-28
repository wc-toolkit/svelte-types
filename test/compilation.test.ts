import { describe, expect, it, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { createRequire } from "module";
import type * as cem from "custom-elements-manifest";
import { generateJsxTypes } from "../src/type-generator";

const require = createRequire(import.meta.url);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jsx-types-compile-"));

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const compileManifest: cem.Package = {
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
            {
              name: "text",
              fieldName: "text",
              description: "Button text",
              type: { text: "string" },
            },
          ],
          members: [
            {
              kind: "field",
              name: "text",
              description: "Button text",
              type: { text: "string" },
            },
            {
              kind: "field",
              name: "variant",
              description: "Button variant",
              type: { text: '"primary" | "secondary"' },
            },
          ],
          events: [
            {
              name: "button-click",
              type: { text: "CustomEvent<string>" },
            },
          ],
          cssProperties: [
            {
              name: "--button-color",
              description: "Button color",
            },
          ],
        },
      ],
      exports: [
        {
          kind: "js",
          name: "Button",
          declaration: {
            name: "Button",
            module: "src/button.ts",
          },
        },
      ],
    },
  ],
};

const buttonStub = `
export class Button {
  text?: string;
  variant?: "primary" | "secondary";
}
`;

const globalEvents = `  "oncustom"?: (e: CustomEvent<string>) => void;`;

const consumerCode = `
import type { ButtonProps, CustomElements, CustomElementsSolidJs, CustomCssProperties } from "./generated.d.ts";

// Component props accept explicit undefined
const props: ButtonProps = { text: undefined, variant: undefined };

// Event handlers accept explicit undefined
const eventProps: ButtonProps = { "onbutton-click": undefined };

// BaseProps / GLOBAL_PROPS accept explicit undefined
const baseProps: CustomElements["x-button"] = { class: undefined, id: undefined, role: undefined };

// BaseEvents / GLOBAL_EVENTS accept explicit undefined
const baseEvents: CustomElements["x-button"] = { onClick: undefined, onKeyDown: undefined };

// globalEvents accept explicit undefined
const customEvents: CustomElements["x-button"] = { oncustom: undefined };

// CSS custom properties accept explicit undefined
const cssProps: CustomCssProperties = { "--button-color": undefined };

// SolidJS props accept explicit undefined
const solidProps: CustomElementsSolidJs["x-button"] = { "prop:text": undefined, innerHTML: undefined, textContent: undefined };
`;

describe("tsc compilation under exactOptionalPropertyTypes", () => {
  it("generated output compiles cleanly with exactOptionalPropertyTypes: true", () => {
    const template = generateJsxTypes(compileManifest, {
      fileName: undefined,
      includeDefaultDOMEvents: true,
      globalEvents,
    });

    expect(template).toBeDefined();

    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "button.ts"), buttonStub);
    fs.writeFileSync(path.join(tmpDir, "generated.d.ts"), template!);
    fs.writeFileSync(path.join(tmpDir, "consumer.ts"), consumerCode);

    const tsconfig = {
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        exactOptionalPropertyTypes: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
      },
      include: ["consumer.ts"],
    };

    fs.writeFileSync(
      path.join(tmpDir, "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2),
    );

    const tscPath = path.resolve(
      path.dirname(require.resolve("typescript")),
      "../bin/tsc",
    );

    let result = "";
    try {
      result = execSync(
        `"${process.execPath}" "${tscPath}" --noEmit --project tsconfig.json`,
        {
          cwd: tmpDir,
          encoding: "utf-8",
          stdio: "pipe",
        },
      ).trim();
    } catch (err) {
      const output = (err as { stdout?: string; stderr?: string; message: string });
      throw new Error(
        `tsc compilation failed:\n${output.stdout || ""}\n${output.stderr || ""}`,
      );
    }

    expect(result).toBe("");
  });
});
