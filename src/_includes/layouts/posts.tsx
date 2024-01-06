import PostList from "../../_components/jsx/PostList.tsx";

export const layout = "layouts/base.vto";

export default ({ title, results, pagination }: Lume.Data) => {
  return (
    <main>
      <h1>{title}</h1>
      <PostList dataList={results!} />
      <hr />
      <nav className="nav">
        <div className="nav-left">
          <a href="/">Back</a>
        </div>
        <div className="nav-center">
          {(pagination?.previous !== null) ? <a href={pagination?.previous}>Prev</a> : <span></span>}
          <span className="text">{pagination?.page} of {pagination?.totalPages}</span>
          {(pagination?.next !== null) ? <a href={pagination?.next}>Next</a> : <span></span>}
        </div>
        <div className="nav-right"></div>
      </nav>
    </main>
  );
};
