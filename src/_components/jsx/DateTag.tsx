import { format } from "std/datetime/format.ts";

type Props = {
  date: Date;
};

export default function DateTag(props: Props) {
  return <time dateTime={props.date.toISOString()}>{format(props.date, "yyyy/MM/dd")}</time>;
}
