<div align="center">
  
![workbench with tools, html, css, javascript, and svelte logos](https://raw.githubusercontent.com/wc-toolkit/svelte-types/refs/heads/main/assets/wc-toolkit_svelte.png)

</div>

# WC Toolkit Custom Element Svelte Types Generator

This package generates TypeScript declarations for custom elements used in [Svelte](https://svelte.dev/) projects. The generated declarations provide type-safe validation for component attributes, component properties, custom events, and CSS custom properties.

Types are generated for all custom elements defined in a [Custom Elements Manifest](https://custom-elements-manifest.open-wc.org/).

Generated declarations include:

- Custom element names and component descriptions
- Attributes and their manifest types
- Component properties passed through Svelte attributes
- Custom event handlers using Svelte's `on:` syntax
- Global element properties and optional DOM event handlers
- CSS custom properties
- Documentation for methods, slots, CSS parts, and CSS states

## Usage

This package supports two generation workflows:

1. Calling a function in your build pipeline
2. Using a plugin for the [Custom Element Manifest Analyzer](https://custom-elements-manifest.open-wc.org/)

### Install

```bash
npm install --save-dev @wc-toolkit/svelte-types
```

### Build Pipeline

```ts
import {
  generateSvelteTypes,
  type SvelteTypesOptions,
} from "@wc-toolkit/svelte-types";
import manifest from "./custom-elements.json";

const options: SvelteTypesOptions = {
  outdir: "./src",
  fileName: "custom-elements-svelte.d.ts",
};

generateSvelteTypes(manifest, options);
```

### CEM Analyzer

#### Setup

Ensure the following steps have been completed before using the plugin:

- Install and configure the [Custom Elements Manifest Analyzer](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/)
- Create a [manifest configuration file](https://custom-elements-manifest.open-wc.org/analyzer/config/#config-file)

#### Import

```js
// custom-elements-manifest.config.js
import { customElementSveltePlugin } from "@wc-toolkit/svelte-types";

export default {
  plugins: [
    customElementSveltePlugin({
      outdir: "./src",
      fileName: "custom-elements-svelte.d.ts",
    }),
  ],
};
```

## Implementation

The generated file declares `svelteHTML.IntrinsicElements`, so Svelte projects only need to include the file in their TypeScript project.

### Option 1: Include the Generated File

Write the generated file somewhere covered by your `tsconfig.json`:

```json
{
  "include": [
    "src/**/*.ts",
    "src/**/*.svelte",
    "src/custom-elements-svelte.d.ts"
  ]
}
```

### Option 2: Configure TypeScript Types

If the generated declaration is published by a package, add its path to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["my-library/custom-elements-svelte"]
  }
}
```

The generated declarations can then be used directly in Svelte markup:

```svelte
<x-button
  label="Save"
  value={value}
  on:change={handleChange}
/>
```

## Configuration Options

The `SvelteTypesOptions` type provides configuration options for the generator.

### Output Options

#### `fileName`

- **Type:** `string`
- **Default:** `"custom-elements-svelte.d.ts"`
- **Description:** Name of the generated declaration file. If omitted or set to `undefined`, the generator returns the declaration text without writing a file.

```ts
{
  fileName: "my-components.d.ts";
}
```

#### `outdir`

- **Type:** `string`
- **Default:** `"./"`
- **Description:** Directory where the generated declaration file is written.

```ts
{
  outdir: "./src/types";
}
```

#### `exclude`

- **Type:** `string[]`
- **Default:** `[]`
- **Description:** Component class names to exclude from generation.

```ts
{
  exclude: ["InternalComponent", "DeprecatedComponent"];
}
```

### Import Options

#### `componentTypePath`

- **Type:** `(name: string, tag?: string, modulePath?: string) => string`
- **Description:** Returns the module path used to import each component class. The third argument is the component's source module path from the manifest. When configured, generated attributes reference the imported component class properties.

```ts
{
  componentTypePath: (name, tagName) =>
    `my-library/components/${tagName}/${tagName}.js`;
}
```

The generated declaration expects named component exports:

```ts
import type { XButton } from "my-library/components/x-button/x-button.js";
```

#### `globalTypePath`

- **Type:** `string`
- **Description:** Imports all component classes and named event detail types from one module instead of generating per-component import paths.

```ts
{
  globalTypePath: "my-library/types";
}
```

When `globalTypePath` or `componentTypePath` is not configured, types are read directly from the manifest.

### Event Options

#### `globalEvents`

- **Type:** `string`
- **Description:** Adds custom event declarations to every generated component type.

```ts
{
  globalEvents: `
    /** Fired when application telemetry is recorded. */
    "on:telemetry"?: (event: CustomEvent<TelemetryDetail>) => void;
  `;
}
```

#### `includeDefaultDOMEvents`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Adds common DOM event handlers such as `on:click`, `onclick`, `on:focus`, and `onfocus` to every component. Enable this only when those handlers are useful for your component API.

```ts
{
  includeDefaultDOMEvents: true;
}
```

#### `includeModernEventHandlers`

- **Type:** `boolean`
- **Default:** `true`
- **Description:** Includes Svelte 5 event attributes such as `onclick` alongside legacy `on:` handlers. Set to `false` when supporting only the legacy event directive syntax.

```ts
{
  includeModernEventHandlers: true;
}
```

Custom events from the manifest are generated using Svelte's legacy event directive syntax and, by default, Svelte 5 event attributes:

```svelte
<x-button on:change={handleChange} />
<x-button onchange={handleChange} />
```

For a manifest event typed as `CustomEvent<ChangeDetail>`, the generated handlers are:

```ts
"on:change"?: (e: CustomEvent<ChangeDetail>) => void;
"onchange"?: (e: CustomEvent<ChangeDetail>) => void;
```

Non-custom event types from the manifest are preserved. For example, an event typed as `MouseEvent` generates a `MouseEvent` handler rather than wrapping it in `CustomEvent`.

### Manifest Type Options

#### `typesSrc`

- **Type:** `string`
- **Description:** Reads types from an alternate property on CEM attributes or properties, such as `parsedType`. If not provided, the standard `type` field is used.

```ts
{
  typesSrc: "parsedType";
}
```

This is useful when another CEM plugin adds parsed or transformed type information:

```json
{
  "name": "variant",
  "type": { "text": "ButtonVariant" },
  "parsedType": { "text": "\"primary\" | \"secondary\"" }
}
```

### Tag Formatting

#### `tagFormatter`

- **Type:** `(tagName: string) => string`
- **Description:** Formats tag names before they are added to `CustomElements`.

```ts
{
  tagFormatter: (tagName) => tagName.replace("my-", "custom-");
}
```

### Utility Options

#### `skip`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Prevents generation when `true`.

```ts
{
  skip: process.env.SKIP_TYPES === "true";
}
```

#### `debug`

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enables generator logs.

```ts
{
  debug: true;
}
```

#### `componentDescriptionOptions`

- **Type:** `ComponentDescriptionOptions`
- **Description:** Configures the component documentation rendered into the generated declaration file, including description source and API order.

```ts
{
  componentDescriptionOptions: {
    descriptionSrc: "summary",
    order: ["attrsAndProps", "events", "slots", "methods", "cssProps"]
  }
}
```

## Svelte Features

### Component Properties

Public component properties are generated as typed component attributes. This is the valid way to pass values to lowercase custom elements in Svelte:

```svelte
<x-slider value={value} />
```

Read-only and static properties are excluded. When a CEM property is associated with an attribute, it is emitted once using the attribute name.

### Custom Events

Manifest events are available through `on:` handlers:

```svelte
<x-input
  on:change={(event) => {
    console.log(event.detail);
  }}
/>
```

Named event detail types are imported automatically when the component type path is configured.

### CSS Custom Properties

CEM CSS custom properties are generated as Svelte style directives and accept `string | number` values:

```svelte
<x-slider style:--track-color={trackColor} />
```

Svelte applies these values through its CSS custom-property wrapper. The generated declaration includes the property as:

```ts
"style:--track-color"?: string | number;
```

### Slots

Slot metadata is included in the generated component documentation. Web component slots are used with Svelte's standard `slot` attribute:

```svelte
<x-card>
  <span slot="title">Card title</span>
  Card content
</x-card>
```

### Refs and Methods

The generator exports a `*Element` type for each component. When component type imports are configured, this aliases the imported class. Otherwise, it includes method signatures found in the manifest. Use it with Svelte's `bind:this`:

```svelte
<script lang="ts">
  import type { DialogElement } from "./types/custom-elements-svelte";

  let dialog: DialogElement;

  function openDialog() {
    dialog.showModal();
  }
</script>

<x-dialog bind:this={dialog} />
<button onclick={openDialog}>Open</button>
```

Named CEM slots also produce a slot-name union for application code:

```ts
import type { CardSlots } from "./types/custom-elements-svelte";

const slotName: CardSlots = "header";
```

## Complete Configuration Example

```ts
import { generateSvelteTypes } from "@wc-toolkit/svelte-types";
import manifest from "./custom-elements.json";

generateSvelteTypes(manifest, {
  // Output
  fileName: "custom-elements-svelte.d.ts",
  outdir: "./src/types",

  // Component filtering
  exclude: ["InternalComponent"],

  // Type imports
  componentTypePath: (name, tagName) =>
    `my-library/components/${tagName}/${tagName}.js`,

  // Events
  includeDefaultDOMEvents: true,
  globalEvents: `
    "on:telemetry"?: (event: CustomEvent<TelemetryDetail>) => void;
  `,

  // Manifest types and tag names
  typesSrc: "parsedType",
  tagFormatter: (tagName) => tagName.toLowerCase(),

  // Component documentation and development
  componentDescriptionOptions: {
    descriptionSrc: "summary",
  },
  debug: process.env.DEBUG === "true",
  skip: false,
});
```

For more information about this package and other Web Component tools, visit the [WC Toolkit website](https://wc-toolkit.com).
