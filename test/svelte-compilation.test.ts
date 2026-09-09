import { afterAll, describe, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { createRequire } from "module";
import { generateSvelteTypes } from "../src/type-generator";

const require = createRequire(import.meta.url);
const fixtureDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "svelte-types-check-"),
);

afterAll(() => {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

describe("Svelte type-check integration", () => {
  it("accepts generated attributes, bindings, events, CSS variables, and refs", () => {
    const manifest = {
      schemaVersion: "1.0.0",
      readme: "",
      modules: [
        {
          kind: "javascript-module" as const,
          path: "src/button.ts",
          declarations: [
            {
              kind: "class" as const,
              name: "Button",
              tagName: "x-button",
              customElement: true as const,
              attributes: [
                { name: "label", fieldName: "label", type: { text: "string" } },
              ],
              members: [
                {
                  kind: "field" as const,
                  name: "label",
                  type: { text: "string" },
                },
                {
                  kind: "field" as const,
                  name: "value",
                  type: { text: "number" },
                },
                {
                  kind: "method" as const,
                  name: "focusInput",
                  parameters: [],
                  return: { type: { text: "void" } },
                },
              ],
              events: [
                { name: "change", type: { text: "CustomEvent<string>" } },
              ],
              cssProperties: [{ name: "--track-color" }],
            },
          ],
        },
      ],
    };

    fs.mkdirSync(path.join(fixtureDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureDir, "src", "custom-elements-svelte.d.ts"),
      generateSvelteTypes(manifest, { fileName: undefined })!,
    );
    fs.writeFileSync(
      path.join(fixtureDir, "src", "App.svelte"),
      `<script lang="ts">
  import type { ButtonElement } from "./custom-elements-svelte";

  let value = 1;
  let button: ButtonElement | undefined;
  const handleChange = (event: CustomEvent<string>) => console.log(event.detail);
  function focusInput() {
    button?.focusInput();
  }
</script>

<x-button
  label="Save"
  value={value}
  bind:this={button}
  onchange={handleChange}
  style:--track-color="black"
></x-button>
`,
    );
    fs.writeFileSync(
      path.join(fixtureDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          allowJs: false,
          module: "ESNext",
          moduleResolution: "bundler",
          target: "ESNext",
          strict: true,
          skipLibCheck: true,
        },
        include: ["src/**/*.svelte", "src/**/*.d.ts"],
      }),
    );

    const svelteCheck = require.resolve("svelte-check/bin/svelte-check");
    try {
      execFileSync(
        process.execPath,
        [svelteCheck, "--tsconfig", "tsconfig.json"],
        {
          cwd: fixtureDir,
          stdio: "pipe",
        },
      );
    } catch (error) {
      const result = error as { stdout?: Buffer; stderr?: Buffer };
      throw new Error(
        `${result.stdout?.toString() || ""}\n${result.stderr?.toString() || ""}`,
      );
    }
  });
});
