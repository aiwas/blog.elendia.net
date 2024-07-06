import PostList from "./_components/jsx/PostList.tsx";

export const layout = "layouts/base.vto";

export default ({ search }: Lume.Data) => {
  const postList = search.pages("type=post", "date=desc", 11);
  return (
    <main>
      <PostList dataList={(postList.length > 10) ? postList.slice(0, -1) : postList} />
      <hr />
      <nav className="nav">
        <div className="nav-left">
          {(postList.length > 10) ? <a href="/posts/page/2">More</a> : ""}
          <a href="/tags/">Tags</a>
        </div>
      </nav>
    </main>
  );
};
