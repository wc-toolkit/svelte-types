import { describe, expect, it } from "vitest";
import { svelteTypesGeneratorPlugin } from "../src/cem-plugin";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("svelteTypesGeneratorPlugin", () => {
  it("implements the cem-generator completion hook", () => {
    const plugin = svelteTypesGeneratorPlugin();

    expect(plugin.name).toBe("@wc-toolkit/svelte-types:cem-generator");
    expect(plugin.afterGenerate).toEqual(expect.any(Function));
  });

  it("does not mutate the source manifest", () => {
    const outdir = mkdtempSync(join(tmpdir(), "svelte-types-test-"));
    const manifest = makeManifest();
    try {
      svelteTypesGeneratorPlugin({ outdir }).afterGenerate(manifest);
      expect(manifest.modules[0].declarations[0]).not.toHaveProperty("modulePath");
      expect(manifest.modules[0].declarations[0]).not.toHaveProperty("definitionPath");
      expect(manifest.modules[0].declarations[0].attributes?.[0]).not.toHaveProperty("propName");
    } finally {
      rmSync(outdir, { recursive: true, force: true });
    }
  });
});

function makeManifest() {
  return {
    schemaVersion: "2.1.0",
    modules: [{ kind: "javascript-module", path: "src/button.ts", declarations: [{ kind: "class", name: "Button", customElement: true, tagName: "x-button", attributes: [{ name: "disabled", type: { text: "boolean" } }], members: [], exports: [] }], exports: [] }],
  };
}
