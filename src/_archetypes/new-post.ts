import { format } from "std/datetime/mod.ts";

export default (title: string) => {
  const slug = title.replace(/\s/g, "-").toLowerCase();
  return {
    path: `/posts/${format(new Date(), "yyyy-MM-dd")}_${slug}.md`,
    content: {
      title: title,
      content: "\n本文を入力",
    },
  };
};
