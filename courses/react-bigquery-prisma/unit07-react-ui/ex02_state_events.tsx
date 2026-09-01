// ex02_state_events: useStateとイベントハンドラで、操作に応じて画面を変える
//
// C#のWinForms/WPF(命令的UI)なら
//   button.Click += (s, e) => { label.Text = "貸出中"; button.Text = "返却する"; };
// のように「コントロールを直接掴んで書き換える」。
// Reactの発想(宣言的UI)はこれと逆で、「状態(state)」を書き換えると
// Reactが差分を計算して画面を勝手に描き直す。「今の状態から何を表示すべきか」を
// 毎回JSXの中で導出する、という頭の切り替えが必要になる。
//
// state は `useState` というフック(Hookという名の特別な関数)で作る。
// `useState(初期値)` は `[今の値, 値を更新する関数]` という2要素の配列を返す
// (C#の `(bool Value, Action<bool> SetValue)` を返すメソッドをイメージすると近い)。
// 更新関数を呼ぶと、Reactはその値を保持したまま再度この関数を実行し直す(再レンダリング)。
import { useState, type ReactElement } from "react";

export type BookStatusToggleProps = {
  title: string;
  /** 省略時は false(貸出可)から始まる */
  initialBorrowed?: boolean;
};

// BookStatusToggle: 貸出中かどうかをボタンでトグル(反転)できるカードを表示する。
//   - 貸出可のとき: 「貸出可」の表示 + ボタンのラベルは「貸出する」
//   - 貸出中のとき: 「貸出中」の表示 + ボタンのラベルは「返却する」
//   - ボタンを押すたびに、上の2状態を反転させる
//
// TODO: 以下を満たすように実装する
//   1. useState を使い、貸出中かどうかを表す真偽値の state を宣言する
//      (initialBorrowed が渡されていればそれを初期値にする。省略時は false)
//   2. ボタンのクリック時に呼ばれるハンドラを作り、stateを「今の値の反対」に更新する
//      (state は直接書き換えず、setter に新しい値を渡す。関数を渡す形でもよい)
//   3. state の値に応じて表示テキストとボタンラベルを出し分けるJSXを返す
export function BookStatusToggle({ title, initialBorrowed = false }: BookStatusToggleProps): ReactElement {
  throw new Error("TODO: 未実装");
}
