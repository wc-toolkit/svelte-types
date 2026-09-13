import { describe, expect, it } from "vitest";
import { svelteTypesGeneratorPlugin } from "../src/cem-plugin";

describe("svelteTypesGeneratorPlugin", () => {
  it("implements the cem-generator completion hook", () => {
    const plugin = svelteTypesGeneratorPlugin();

    expect(plugin.name).toBe("@wc-toolkit/svelte-types:cem-generator");
    expect(plugin.afterGenerate).toEqual(expect.any(Function));
  });
});
