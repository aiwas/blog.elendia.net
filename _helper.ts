import type Site from "@lumeland/core/site.ts";
import type { Environment } from "ventojs/core/environment.js";

type AddHelperParameters = Parameters<typeof Site.prototype.helper>;

const LEADING_SPACES = /^\n|\s+$|^ {4}/gm;

const mastodonCustomTag: AddHelperParameters = [
  "toot",
  (tootUrl: string) => {
    const url = new URL(tootUrl);
    return /*html*/ `
      <iframe src="${url.href}/embed" class="mastodon-embed" style="max-width: 100%; border: 0" width="400" allowfullscreen></iframe>
      <script src="https://${url.host}/embed.js" async></script>
    `.replace(LEADING_SPACES, "");
  },
  { type: "tag" },
];

const youtubeCustomTag: AddHelperParameters = [
  "youtube",
  (videoId: string) => {
    return /*html*/ `
      <div class="youtube-embed">
        <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
      </div>
    `.replace(LEADING_SPACES, "");
  },
  { type: "tag" },
];

export default function helpers(site: Site): void {
  for (const helper of [mastodonCustomTag, youtubeCustomTag]) {
    site.helper(...helper);
  }
  site.hooks.addVentoPlugin((environment: Environment) => {
    environment.tags.push((env, [, code], output, tokens) => {
      // 既存記事の components 呼び出しを v4 の comp に変換し、非同期の描画を待つ。
      const component = /^(?:await\s+)?components(?=\.|\[)/;
      if (component.test(code)) {
        const value = `await ${code.replace(component, "comp")}`;
        const rendered = env.compileFilters(tokens, value, env.options.autoescape);
        return `${output} += ${rendered};`;
      }
      const match = /^(toot|youtube)\s+(.+)$/.exec(code);
      if (!match) {
        return;
      }
      const value = env.compileFilters(tokens, match[2]);
      return `${output} += __env.filters.${match[1]}(${value});`;
    });
  });
}
