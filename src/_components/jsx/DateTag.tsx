import { formatDate } from "../../../lib/date.ts";

type Props = {
  date: Date;
};

export default function DateTag({ date }: Props) {
  return <time datetime={date.toISOString()}>{formatDate(date)}</time>;
}
