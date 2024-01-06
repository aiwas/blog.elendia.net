import type { Options } from "lume/plugins/feed.ts";

export default <Options> {
  output: ["/posts.rss", "/posts.json"],
  query: "type=post",
  sort: "date=desc",
  limit: 10,
  info: {
    title: "=site.title",
    description: "=site.description",
    published: new Date(),
    lang: "ja",
    generator: true,
  },
  items: {
    title: "=title",
    published: "=date",
    content: "=children",
    lang: "=lang",
  },
};
