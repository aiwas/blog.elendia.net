import lume from "@lumeland/lume";
import jsx from "@lumeland/plugin-jsx";
import metas from "@lumeland/plugin-metas";

import feed from "@lumeland/plugin-feed";
import feedOptions from "./_feed.ts";

import sass from "@lumeland/plugin-sass";

import prism from "@lumeland/plugin-prism";
import extractDate from "@lumeland/plugin-extract-date";
import { log } from "@lumeland/core/utils/log.ts";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-shell-session.js";
import "prismjs/components/prism-powershell.js";

import markdown from "./_markdown.ts";
import helpers from "./_helper.ts";
import { assetExtensions } from "./lib/content.ts";

process.env.TZ = "Asia/Tokyo";

const site = lume(
  {
    src: "./src",
    dest: "./_site",
    location: new URL("https://blog.elendia.net/"),
    components: {
      cssFile: "/components.css",
    },
  },
  {
    markdown,
  },
);

site.use(jsx());
site.use(extractDate());
site.use(metas());
site.use(sass());
site.use(prism());

// helper
helpers(site);

// microCMS
if (process.env.MICROCMS_ENABLE !== "true") {
  site.ignore("microcms.page.ts");
}

// 静的ファイルをコピー
site.add("style.scss");
site.copy(assetExtensions);

// 外部リンクに target="_blank" を設定
site.process([".html"], (pages) => {
  for (const page of pages) {
    const externalLinks = page.document?.querySelectorAll('a[href^="http"]');
    externalLinks?.forEach((link) => {
      link.setAttribute("target", "_blank");
    });
  }
});

site.use(feed(feedOptions));

site.addEventListener("beforeSave", () => {
  const paths = new Set<string>();
  for (const file of [...site.pages, ...site.files]) {
    const path = file.outputPath.toLowerCase();
    if (paths.has(path)) {
      log.error(`公開先のパスが重複: ${path}`);
    }
    paths.add(path);
  }
  return !log.hasErrors;
});

export default site;
