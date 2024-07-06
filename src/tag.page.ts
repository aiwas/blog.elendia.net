/**
 * タグ付き記事一覧ページ生成
 * - Layout: tag.tsx
 * - URL: /tags/[tag]
 * @param {Lume.Data} 検索ヘルパー
 */
export default function* ({ search }: Lume.Data) {
  for (const tag of search.values("tags") as string[]) {
    yield {
      layout: "layouts/tag.tsx",
      type: "tag",
      url: `/tags/${tag}/`,
      title: `#${tag} の記事一覧`,
      tag,
    };
  }
}
