import type { Options } from "lume/plugins/markdown.ts";
import anchor from "https://jspm.dev/markdown-it-anchor";
import abbr from "https://jspm.dev/markdown-it-abbr";
import subscript from "https://jspm.dev/markdown-it-sub";
import superscript from "https://jspm.dev/markdown-it-sup";
import footnote from "https://jspm.dev/markdown-it-footnote";
import tableOfContents from "https://jspm.dev/markdown-it-table-of-contents";
import container from "https://jspm.dev/markdown-it-container";
import namedCodeBlocks from "https://jspm.dev/markdown-it-named-code-blocks";
import blockEmbed from "https://jspm.dev/markdown-it-block-embed";
// import linkPreview from "https://jspm.dev/markdown-it-link-preview";
// import linkPreview from "npm:markdown-it-link-preview";

export default <Options> {
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
    // linkPreview,
  ],
  options: {
    html: true,
  },
  keepDefaultPlugins: true,
};
