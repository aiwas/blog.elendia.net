declare module "markdown-it-abbr" {
  import type { PluginSimple } from "markdown-it";
  const plugin: PluginSimple;
  export default plugin;
}

declare module "markdown-it-sub" {
  import type { PluginSimple } from "markdown-it";
  const plugin: PluginSimple;
  export default plugin;
}

declare module "markdown-it-sup" {
  import type { PluginSimple } from "markdown-it";
  const plugin: PluginSimple;
  export default plugin;
}

declare module "markdown-it-table-of-contents" {
  import type { PluginWithOptions } from "markdown-it";
  const plugin: PluginWithOptions<{ includeLevel: number[] }>;
  export default plugin;
}

declare module "markdown-it-named-code-blocks" {
  import type { PluginSimple } from "markdown-it";
  const plugin: PluginSimple;
  export default plugin;
}

declare module "markdown-it-block-embed" {
  import type { PluginSimple } from "markdown-it";
  const plugin: PluginSimple;
  export default plugin;
}
