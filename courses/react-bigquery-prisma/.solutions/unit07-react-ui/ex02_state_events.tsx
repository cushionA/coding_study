// ex02_state_events: useStateとイベントハンドラで、操作に応じて画面を変える(解答)
import { useState, type ReactElement } from "react";

export type BookStatusToggleProps = {
  title: string;
  initialBorrowed?: boolean;
};

export function BookStatusToggle({ title, initialBorrowed = false }: BookStatusToggleProps): ReactElement {
  const [borrowed, setBorrowed] = useState(initialBorrowed);

  function handleClick() {
    setBorrowed((prev) => !prev);
  }

  return (
    <div>
      <h3>{title}</h3>
      <p>{borrowed ? "貸出中" : "貸出可"}</p>
      <button onClick={handleClick}>{borrowed ? "返却する" : "貸出する"}</button>
    </div>
  );
}
