import fs from "fs";
import path from "path";
import prettier from "@prettier/sync";
import type * as cem from "custom-elements-manifest";
import {
  getAllComponents,
  getComponentDetailsTemplate,
  getComponentPublicMethods,
  getComponentPublicProperties,
  getCustomEventDetailTypes,
  getMemberDescription,
  toPascalCase,
} from "@wc-toolkit/cem-utilities";
import type { Component } from "@wc-toolkit/cem-utilities";
import { Logger } from "./logger";
import { GLOBAL_EVENTS, GLOBAL_PROPS } from "./global-types";
import type { SvelteTypesOptions } from "./types";

const DEFAULT_OPTIONS: SvelteTypesOptions = {
  fileName: "custom-elements-svelte.d.ts",
  outdir: "./",
  exclude: [],
  includeModernEventHandlers: true,
};

/** Generates Svelte type declarations from a Custom Elements Manifest. */
export function generateSvelteTypes(
  manifest: cem.Package,
  options: SvelteTypesOptions = {},
) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const log = new Logger(mergedOptions.debug);

  if (mergedOptions.skip) {
    log.yellow("[svelte-types] - Skipped");
    return;
  }

  if (!manifest?.modules?.length) {
    log.red("[svelte-types] - No modules found in the manifest.");
    return;
  }

  if (!mergedOptions.outdir) {
    log.red("[svelte-types] - No output directory specified.");
    return;
  }

  const template = getTypeTemplate(structuredClone(manifest), mergedOptions);

  if (mergedOptions.fileName) {
    createOutDir(mergedOptions.outdir);
    const outputPath = saveFile(
      mergedOptions.outdir,
      mergedOptions.fileName,
      template,
    );
    log.green(`[svelte-types] - Generated "${outputPath}".`);
  }

  return template;
}

function getTypeTemplate(manifest: cem.Package, options: SvelteTypesOptions) {
  const components = getAllComponents(manifest, options.exclude).filter(
    (component) =>
      !options.exclude?.includes(component.name) &&
      component.customElement &&
      component.name &&
      component.tagName,
  ) as unknown as cem.CustomElement[];

  return `
${getImports(manifest, components, options)}

type BaseProps = {
${GLOBAL_PROPS}
};

type BaseEvents = {
${options.globalEvents ?? ""}
${options.includeDefaultDOMEvents ? getSvelteGlobalEvents(options.includeModernEventHandlers) : ""}
};

${components.map((component) => getComponentPropsTemplate(component, options, manifest)).join("\n")}
${components.map((component) => getComponentElementTemplate(component, options, manifest)).join("\n")}

export type CustomElements = {
${components
  .map((component) => {
    const tagName = formatTagName(component.tagName!, options);
    const typeName = getComponentTypeName(component, manifest);
    return `
  /**
    ${getComponentDetailsTemplate(toUtilityComponent(component), options.componentDescriptionOptions, true)}
  */
   "${tagName}": Partial<${typeName}Props & BaseProps & BaseEvents>;`;
  })
  .join("\n")}
};

declare global {
  namespace svelteHTML {
    interface IntrinsicElements extends CustomElements {}
  }
}
`;
}

function getImports(
  manifest: cem.Package,
  components: cem.CustomElement[],
  options: SvelteTypesOptions,
) {
  const names = new Map<string, Set<string>>();
  const importedTypes = new Set<string>();

  for (const component of components) {
    if (isCssOnlyComponent(component, manifest)) continue;

    const componentModulePath = getComponentModulePath(manifest, component);
    const importPath = options.globalTypePath
      ? options.globalTypePath
      : typeof options.componentTypePath === "function"
        ? options.componentTypePath(
            component.name,
            component.tagName,
            componentModulePath,
          )
        : componentModulePath
          ? normalizeImportPath(componentModulePath, options.outdir)
          : undefined;

    if (options.globalTypePath || options.componentTypePath) {
      if (importPath && !importedTypes.has(component.name)) {
        addImport(names, importPath, component.name);
        importedTypes.add(component.name);
      }
    }

    if (importPath) {
      const eventTypes = new Set([
        ...getCustomEventDetailTypes(toUtilityComponent(component), [
          component.name,
        ]),
        ...(component.events ?? [])
          .map((event) =>
            /^CustomEvent<(.+)>$/
              .exec(event.type?.text?.trim() ?? "")?.[1]
              ?.trim(),
          )
          .filter((detail): detail is string =>
            Boolean(detail && /^[A-Z][\w$]*$/.test(detail)),
          ),
      ]);
      for (const eventType of eventTypes) {
        if (importedTypes.has(eventType)) continue;
        addImport(names, importPath, eventType);
        importedTypes.add(eventType);
      }
    }

    if (!options.globalTypePath && !options.componentTypePath) {
      const types = [
        ...(component.attributes ?? []).map(
          (attribute) =>
            getConfiguredType(attribute, options.typesSrc) ?? attribute.type,
        ),
        ...(component.members ?? []).flatMap((member) =>
          "type" in member
            ? [getConfiguredType(member, options.typesSrc) ?? member.type]
            : [],
        ),
      ];
      for (const type of types) {
        for (const reference of type?.references ?? []) {
          const name = reference.name;
          const referencePath = reference.package ?? reference.module;
          if (!name || !referencePath || importedTypes.has(name)) continue;
          const resolvedPath = reference.package
            ? reference.package
            : normalizeImportPath(referencePath, options.outdir);
          addImport(names, resolvedPath, name);
          importedTypes.add(name);
        }
      }
    }
  }

  return [...names.entries()]
    .map(
      ([importPath, exports]) =>
        `import type { ${[...exports].join(", ")} } from "${importPath}";`,
    )
    .join("\n");
}

function getComponentPropsTemplate(
  component: cem.CustomElement,
  options: SvelteTypesOptions,
  manifest: cem.Package,
) {
  const typeName = getComponentTypeName(component, manifest);
  const cssOnly = isCssOnlyComponent(component, manifest);
  const typeFor = (
    name: string,
    source: unknown,
    fallback: cem.Type | undefined,
  ) => {
    if (!cssOnly && (options.globalTypePath || options.componentTypePath)) {
      return `${component.name}['${name}']`;
    }
    const configured = getConfiguredType(source, options.typesSrc);
    const text = configured?.text || fallback?.text || "string";
    return cssOnly ? normalizeCssUnion(text) : text;
  };

  const attributes = (component.attributes ?? [])
    .map(
      (
        attribute,
      ) => `  /** ${getMemberDescription(attribute.description, attribute.deprecated)} */
          "${attribute.name}"?: ${typeFor(attribute.fieldName || attribute.name, attribute, attribute.type)};`,
    )
    .join("\n");
  const publicProperties = getComponentPublicProperties(
    toUtilityComponent(component),
  )
    .filter((property) => !property.readonly && !property.static)
    .filter(
      (property) =>
        !(component.attributes ?? []).some(
          (attribute) => attribute.fieldName === property.name,
        ),
    );
  const properties = publicProperties
    .map(
      (
        property,
      ) => `  /** ${getMemberDescription(property.description, property.deprecated)} */
   "${property.name}"?: ${typeFor(property.name, property, property.type)};`,
    )
    .join("\n");
  const events = (component.events ?? [])
    .map((event) => {
      const eventType = event.type?.text || "Event";
      const handlers = [`  "on:${event.name}"?: (e: ${eventType}) => void;`];
      if (options.includeModernEventHandlers) {
        handlers.push(`  "on${event.name}"?: (e: ${eventType}) => void;`);
      }
      return `  /** ${getMemberDescription(event.description, event.deprecated)} */
${handlers.join("\n")}`;
    })
    .join("\n");

  const cssProperties = (component.cssProperties ?? [])
    .map(
      (
        property,
      ) => `  /** ${getMemberDescription(property.description, property.deprecated)} */
  "style:${property.name}"?: string | number;`,
    )
    .join("\n");

  return `export type ${typeName}Props = {
${attributes}
${properties}
${events}
${cssProperties}
};`;
}

function addImport(
  imports: Map<string, Set<string>>,
  importPath: string,
  name: string,
) {
  if (!imports.has(importPath)) imports.set(importPath, new Set());
  imports.get(importPath)!.add(name);
}

function getComponentElementTemplate(
  component: cem.CustomElement,
  options: SvelteTypesOptions,
  manifest: cem.Package,
) {
  const typeName = getComponentTypeName(component, manifest);
  const elementType = `${typeName}Element`;
  const slots = component.slots?.map((slot) => JSON.stringify(slot.name)) ?? [];
  const slotType = slots.length
    ? `export type ${typeName}Slots = ${slots.join(" | ")};`
    : "";

  if (isCssOnlyComponent(component, manifest)) {
    return `export type ${elementType} = HTMLElement;
${slotType}`;
  }

  if (options.globalTypePath || options.componentTypePath) {
    return `export type ${elementType} = ${component.name};
${slotType}`;
  }

  const methods = getComponentPublicMethods(toUtilityComponent(component))
    .filter((method) => !method.static)
    .map((method) => {
      const parameters = (method.parameters ?? [])
        .map((parameter) => {
          const optional = parameter.optional ? "?" : "";
          const rest = parameter.rest ? "..." : "";
          return `${rest}${parameter.name}${optional}: ${parameter.type?.text || "unknown"}`;
        })
        .join(", ");
      return `  /** ${getMemberDescription(method.description, method.deprecated)} */
  ${method.name}(${parameters}): ${method.return?.type?.text || "void"};`;
    })
    .join("\n");

  return `export interface ${elementType} extends HTMLElement {
${methods}
}
${slotType}`;
}

function formatTagName(tagName: string, options: SvelteTypesOptions) {
  return options.tagFormatter ? options.tagFormatter(tagName) : tagName;
}

function isCssOnlyComponent(
  component: cem.CustomElement & { modulePath?: string },
  manifest?: cem.Package,
) {
  if (component.superclass?.name === "HTMLUnknownElement") return true;
  if (!component.name || !component.tagName) return false;
  if (
    component.name === component.tagName ||
    !/^[A-Za-z_$][\w$]*$/.test(component.name)
  ) {
    return true;
  }
  const module = manifest?.modules.find(
    (candidate) =>
      candidate.path === component.modulePath &&
      candidate.declarations?.some(
        (declaration) => declaration.name === component.name,
      ),
  );
  if (!manifest || !module) return false;
  return !module.exports?.some(
    (declaration) =>
      declaration.kind === "js" &&
      (declaration.name === component.name ||
        declaration.declaration.name === component.name),
  );
}

function getComponentTypeName(
  component: cem.CustomElement,
  manifest?: cem.Package,
) {
  return isCssOnlyComponent(component, manifest)
    ? toPascalCase(component.tagName!)
    : component.name;
}

function toUtilityComponent(component: cem.CustomElement): Component {
  return component as unknown as Component;
}

function getConfiguredType(source: unknown, sourceKey: string | undefined) {
  if (!sourceKey || !source || typeof source !== "object") return undefined;
  const value = (source as Record<string, unknown>)[sourceKey];
  return value && typeof value === "object" && "text" in value
    ? (value as cem.Type)
    : undefined;
}

function getComponentModulePath(
  manifest: cem.Package,
  component: cem.CustomElement,
) {
  return manifest.modules.find((module) =>
    module.declarations?.some(
      (declaration) => declaration.name === component.name,
    ),
  )?.path;
}

function normalizeImportPath(importPath: string, outdir?: string) {
  if (importPath.startsWith("@")) return importPath;
  const looksLikeFilePath =
    path.isAbsolute(importPath) ||
    importPath.startsWith(".") ||
    importPath.includes("/") ||
    /\.[cm]?[jt]sx?$/.test(importPath);
  if (!looksLikeFilePath) return importPath;
  const relativePath = path
    .relative(path.resolve(outdir ?? "./"), path.resolve(importPath))
    .split(path.sep)
    .join("/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function normalizeCssUnion(type: string) {
  const tsTypes = new Set([
    "any",
    "bigint",
    "boolean",
    "false",
    "never",
    "null",
    "number",
    "object",
    "string",
    "symbol",
    "this",
    "true",
    "undefined",
    "unknown",
    "void",
  ]);
  return type
    .split("|")
    .map((member) => {
      const value = member.trim();
      return /^[a-z][\w-]*$/.test(value) && !tsTypes.has(value)
        ? JSON.stringify(value)
        : value;
    })
    .join(" | ");
}

function getSvelteGlobalEvents(includeModern: boolean | undefined) {
  return GLOBAL_EVENTS.replace(
    /^(\s*)on([A-Z][\w]*)(\?:.*)$/gm,
    (_, indent: string, name: string, declaration: string) => {
      const eventName = name.toLowerCase();
      const handlers = [`${indent}"on:${eventName}"${declaration}`];
      if (includeModern) handlers.push(`${indent}on${eventName}${declaration}`);
      return handlers.join("\n");
    },
  );
}

function createOutDir(outDir: string) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
}

function saveFile(outDir: string, fileName: string, contents: string) {
  const outputPath = path.join(outDir, fileName);
  fs.writeFileSync(
    outputPath,
    prettier.format(contents, { parser: "typescript", printWidth: 120 }),
  );
  return outputPath;
}
