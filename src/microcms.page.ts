import type { MicroCMSContentId, MicroCMSDate } from "https://esm.sh/microcms-js-sdk@2.7.0";

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

export default async function* () {
  const endpoint = "blog-article";
  const microcmsUrl = `https://${Deno.env.get("MICROCMS_SERVICE_DOMAIN")}.microcms.io/api/v1/${endpoint}`;
  console.log(`${microcmsUrl} からデータを取得します。`);
  const data = await fetch(
    microcmsUrl,
    {
      method: "GET",
      headers: { "X-MICROCMS-API-KEY": Deno.env.get("MICROCMS_API_KEY")! },
    },
  )
    .then((response) => response.json())
    .catch((reason) => console.error(reason));

  for (const content of data.contents as Blog[]) {
    yield {
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
