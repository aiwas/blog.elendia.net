import PostList from "./_components/jsx/PostList.tsx";

export const layout = "layouts/base.vto";

export default ({ search }: Lume.Data) => {
  const postList = search.pages("type=post", "date=desc", 10);
  return (
    <main>
      <PostList dataList={postList} />
      <hr />
      <nav className="nav">
        <div className="nav-left">
          <a href="/posts/page/2">More</a>
          <a href="/tags/">Tags</a>
        </div>
      </nav>
    </main>
  );
};
