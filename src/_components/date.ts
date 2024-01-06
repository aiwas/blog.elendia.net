import { format } from "std/datetime/format.ts";

type Props = {
  date: Date;
};

export default ({ date }: Props) => {
  return /*html*/ `<time dateTime=${date.toISOString()}>${format(date, "yyyy/MM/dd")}</time>`;
};
