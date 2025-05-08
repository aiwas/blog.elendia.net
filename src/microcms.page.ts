import { createClient, type MicroCMSContentId, type MicroCMSDate } from "microcms";

interface BlogArticle {
  title: string;
  body: string;
  slug: string;
  isDraft: boolean;
  category?: string;
  tags?: (MicroCMSContentId & MicroCMSDate & BlogTag)[];
}

interface BlogTag {
  name: string;
  name_ja: string;
}

type Blog = MicroCMSContentId & MicroCMSDate & BlogArticle;

// 他のページよりも前に生成する
export const renderOrder = -1;

/**
 * MicroCMS記事ページ生成
 * - Layout: post.vto
 * - URL: /posts/[slug]
 */
export default async function* () {
  const microcmsClient = createClient({
    serviceDomain: Deno.env.get("MICROCMS_SERVICE_DOMAIN")!,
    apiKey: Deno.env.get("MICROCMS_API_KEY")!,
    customFetch: fetch,
  });
  const data = await microcmsClient.getAllContents<Blog>({
    endpoint: "blog-article",
  });

  for (const content of data) {
    yield {
      date: content.publishedAt,
      layout: "layouts/post.vto",
      type: "post",
      url: `/posts/${content.slug}/`,
      title: content.title,
      tags: content.tags?.map((x) => x.name_ja),
      // 先にカスタムフィルターを処理する
      templateEngine: ["vto", "md"],
      content: content.body,
    };
  }
}
