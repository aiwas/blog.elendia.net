import lume from "lume/mod.ts";
import jsx from "lume/plugins/jsx.ts";
import metas from "lume/plugins/metas.ts";

import feed from "lume/plugins/feed.ts";
import feedOptions from "./_feed.ts";

import sass from "lume/plugins/sass.ts";

import prism from "lume/plugins/prism.ts";
import "npm:prismjs@1.29.0/components/prism-csharp.js";
import "npm:prismjs@1.29.0/components/prism-typescript.js";
import "npm:prismjs@1.29.0/components/prism-bash.js";
import "npm:prismjs@1.29.0/components/prism-shell-session.js";
import "npm:prismjs@1.29.0/components/prism-powershell.js";

// import tailwindcss from "lume/plugins/tailwindcss.ts";
// import postcss from "lume/plugins/postcss.ts";
// import postcssImport from "https://deno.land/x/postcss_import@0.1.4/mod.js";

import markdown from "./_markdown.ts";
import helpers from "./_helper.ts";

Deno.env.set("TZ", "Asia/Tokyo");

const site = lume({
  src: "./src",
  dest: "./_site",
  components: {
    variable: "components",
  },
}, {
  markdown,
});

site.use(jsx());
site.use(metas());
site.use(feed(feedOptions));
site.use(sass());
site.use(prism({ extensions: [".html", ".md"] }));

// site.use(tailwindcss());
// site.use(postcss({
//   plugins: [postcssImport]
// }));

// helper
helpers.forEach((h) => site.helper(...h));

// microCMS
if (Deno.env.get("MICROCMS_ENABLE") !== "true") {
  site.ignore("microcms.page.ts");
}

// 静的ファイルをコピー
site.copy([".jpg", ".png"]);

// 外部リンクに target="_blank" を設定
site.process([".html"], (pages) => {
  for (const page of pages) {
    const externalLinks = page.document?.querySelectorAll('a[href^="http"]');
    externalLinks?.forEach((link) => {
      link.setAttribute("target", "_blank");
    });
  }
});

export default site;
