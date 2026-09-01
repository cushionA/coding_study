// ex01_props_component: propsを受け取って表示するだけの、最初の関数コンポーネント(解答)
import type { ReactElement } from "react";

export type BookCardProps = {
  title: string;
  author: string;
};

export function BookCard({ title, author }: BookCardProps): ReactElement {
  return (
    <div>
      <h3>{title}</h3>
      <p>著者: {author}</p>
    </div>
  );
}
