import { formatDate } from "../../lib/date.ts";

type Props = {
  date: Date;
};

export default ({ date }: Props) => {
  return /*html*/ `<time datetime="${date.toISOString()}">${formatDate(date)}</time>`;
};
