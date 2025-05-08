import type Site from "lume/core/site.ts";

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

export default [
  mastodonCustomTag,
  youtubeCustomTag,
] as AddHelperParameters[];
