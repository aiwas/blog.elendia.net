/**
 * 記事一覧ページ生成
 * - Layout: posts.tsx
 * - URL: /posts/page/[n]
 * @param {Lume.Data} 検索ヘルパー、ページングヘルパー
 */
export default function* ({ search, paginate }: Lume.Data) {
  const posts = search.pages("type=post", "date=desc");
  for (const result of paginate(posts, { url: (n) => `/posts/page/${n}/`, size: 10 })) {
    yield {
      layout: "layouts/posts.tsx",
      title: `記事一覧（${result.pagination.page} of ${result.pagination.totalPages}）`,
      ...result,
    };
  }
}
