import type { Options } from "@lumeland/plugin-feed";

export default {
  output: ["/posts.rss", "/posts.json"],
  query: "type=post",
  sort: "date=desc",
  limit: 10,
  info: {
    title: "=metas.site",
    description: "=metas.description",
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
} satisfies Options;
