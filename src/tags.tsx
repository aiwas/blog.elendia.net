export const layout = "layouts/base.vto";
export const title = "タグ一覧";

/**
 * タグ一覧ページ
 * - Layout: base.vto
 * - URL: /tags
 * @param {Lume.Data} 検索ヘルパー
 */
export default ({ search }: Lume.Data) => {
  const tagList: string[] = search.values("tags");
  return (
    <main id="Tags">
      <h1>{title}</h1>
      <section>
        <ul className="fe-tags">
          {tagList.map((tag) => (
            <li key={tag}>
              <a href={`./${tag}/`}>{tag} ({search.pages(`'${tag}'`).length})</a>
            </li>
          ))}
        </ul>
      </section>
      <hr />
      <nav className="nav">
        <div className="nav-left">
          <a href="/">Back</a>
        </div>
      </nav>
    </main>
  );
};
