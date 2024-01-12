import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

type Props = {
  date: Date;
};

export default function DateTag({ date }: Props) {
  const d = datetime(date).toZonedTime("Asia/Tokyo");
  return <time dateTime={d.toISO()}>{d.format("YYYY/MM/dd")}</time>;
}
