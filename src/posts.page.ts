//
// /posts/pages/{n}
//

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
