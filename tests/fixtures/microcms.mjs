globalThis.fetch = async (input) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.hostname !== "migration-test.microcms.io") throw new Error(`Unexpected fetch: ${url.hostname}`);
  if (process.env.MOCK_CMS_FAILURE === "true") return new Response("Unauthorized", { status: 401 });
  return Response.json({
    contents: [
      {
        id: "cms-id",
        title: "CMS article",
        body: '## CMS body\n\n{{ youtube "cms-video" }}',
        slug: "cms-entry",
        isDraft: false,
        publishedAt: "2026-11-20T01:30:00+09:00",
        createdAt: "2026-11-20T01:30:00+09:00",
        updatedAt: "2026-11-20T01:30:00+09:00",
        revisedAt: "2026-11-20T01:30:00+09:00",
        tags: [{ id: "tag", name: "typescript", name_ja: "TypeScript" }],
      },
    ],
    totalCount: 1,
    offset: 0,
    limit: 100,
  });
};
