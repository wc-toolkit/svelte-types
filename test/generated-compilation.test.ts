import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { generateSvelteTypes } from "../src/type-generator";

const require = createRequire(import.meta.url);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-types-compile-"));

afterAll(() => fs.rmSync(tempDir, { recursive: true, force: true }));

describe("generated Svelte declarations compile", () => {
  it("type-checks event payload imports, CSS-only attributes, and intrinsic elements", () => {
    const srcDir = path.join(tempDir, "src");
    const typesDir = path.join(tempDir, "types");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(typesDir, { recursive: true });
    fs.symlinkSync(
      path.resolve(process.cwd(), "node_modules"),
      path.join(tempDir, "node_modules"),
      "dir",
    );
    fs.writeFileSync(
      path.join(srcDir, "button.ts"),
      `import type { Mode } from "./types";\nexport type ErrorDetail = { message: string };\nexport class Button extends HTMLElement { mode?: Mode; }\n`,
    );

    const buttonPath = path.join(srcDir, "button.ts");
    const typesPath = path.join(srcDir, "types.ts");
    const cssPath = path.join(srcDir, "zd-flex.css");
    fs.writeFileSync(typesPath, 'export type Mode = "compact" | "wide";\n');
    const manifest = {
      schemaVersion: "1.0.0",
      readme: "",
      modules: [
        {
          kind: "javascript-module" as const,
          path: buttonPath,
          declarations: [
            {
              kind: "class" as const,
              name: "Button",
              tagName: "x-button",
              customElement: true,
              attributes: [
                {
                  name: "mode",
                  fieldName: "mode",
                  type: {
                    text: "Mode",
                    references: [{ name: "Mode", module: typesPath }],
                  },
                },
              ],
              events: [
                { name: "error", type: { text: "CustomEvent<ErrorDetail>" } },
              ],
            },
          ],
          exports: [
            {
              kind: "js" as const,
              name: "Button",
              declaration: { name: "Button", module: buttonPath },
            },
          ],
        },
        {
          kind: "javascript-module" as const,
          path: typesPath,
          declarations: [],
          exports: [
            {
              kind: "js" as const,
              name: "Mode",
              declaration: { name: "Mode", module: typesPath },
            },
          ],
        },
        {
          kind: "javascript-module" as const,
          path: cssPath,
          declarations: [
            {
              kind: "class" as const,
              name: "Layout",
              tagName: "zd-flex",
              customElement: true,
              attributes: [
                { name: "direction", type: { text: "row | column" } },
              ],
            },
          ],
          exports: [],
        },
      ],
    };
    const generated = generateSvelteTypes(manifest, {
      fileName: undefined,
      outdir: typesDir,
    });
    fs.writeFileSync(path.join(typesDir, "generated.d.ts"), generated!);
    fs.writeFileSync(
      path.join(tempDir, "consumer.ts"),
      `import type { ButtonProps, ZdFlexProps } from "./types/generated";\nimport type { ErrorDetail } from "./src/button";\nimport type { Mode as ImportedMode } from "./src/types";\nconst layout: ZdFlexProps = { direction: "row" };\nconst mode: ButtonProps["mode"] = "compact" satisfies ImportedMode;\nconst event: ButtonProps["on:error"] = (value) => value.detail satisfies ErrorDetail;\nconst intrinsic: svelteHTML.IntrinsicElements["zd-flex"] = { direction: "column" };\n`,
    );
    fs.writeFileSync(
      path.join(tempDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["consumer.ts", "types/**/*.d.ts", "src/**/*.ts"],
      }),
    );

    const tscPath = path.resolve(
      path.dirname(require.resolve("typescript")),
      "../bin/tsc",
    );
    expect(() =>
      execFileSync(
        process.execPath,
        [tscPath, "--noEmit", "--project", "tsconfig.json"],
        {
          cwd: tempDir,
          stdio: "pipe",
        },
      ),
    ).not.toThrow();
  });
});
