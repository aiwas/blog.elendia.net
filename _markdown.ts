import type { Options } from "@lumeland/plugin-markdown";
import anchor from "markdown-it-anchor";
import abbr from "markdown-it-abbr";
import subscript from "markdown-it-sub";
import superscript from "markdown-it-sup";
import footnote from "markdown-it-footnote";
import tableOfContents from "markdown-it-table-of-contents";
import container from "markdown-it-container";
import namedCodeBlocks from "markdown-it-named-code-blocks";
import blockEmbed from "markdown-it-block-embed";

export default {
  plugins: [
    anchor,
    abbr,
    subscript,
    superscript,
    footnote,
    [tableOfContents, { includeLevel: [2, 3, 4] }],
    [container, "warning"],
    [namedCodeBlocks],
    [blockEmbed],
  ],
  options: {
    html: true,
  },
  useDefaultPlugins: true,
} satisfies Options;
