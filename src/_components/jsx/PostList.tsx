import type { Data } from "@lumeland/core/types.ts";
import DateTag from "./DateTag.tsx";

type Props = {
  dataList: Data[];
};

export default function PostList({ dataList }: Props) {
  return (
    <table className="fe-post-list">
      <tbody>
        {dataList.map((page, i) => (
          <tr aria-rowindex={i + 1} key={i}>
            <th>
              <DateTag date={page.date} />
            </th>
            <td>
              <a href={page.url}>{page.title}</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
