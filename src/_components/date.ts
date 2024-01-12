import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

type Props = {
  date: Date;
};

export default ({ date }: Props) => {
  const d = datetime(date).toZonedTime("Asia/Tokyo");
  return /*html*/ `<time dateTime=${d.toISO()}>${d.format("YYYY/MM/dd")}</time>`;
};
