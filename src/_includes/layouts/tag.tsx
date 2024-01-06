import PostList from "../../_components/jsx/PostList.tsx";

export const layout = "layouts/base.vto";

export default ({ search, title, tag }: Lume.Data) => {
  const postList = search.pages(`'${tag}'`, "date=desc");
  return (
    <main>
      <h1>{title}</h1>
      <PostList dataList={postList} />
      <hr />
      <nav className="nav">
        <div className="nav-left">
          <a href="../">Tags</a>
        </div>
      </nav>
    </main>
  );
};
