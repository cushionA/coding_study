// ex01_search_input: 制御コンポーネント + デバウンスで検索入力を作る
//
// 「検索ボックスに1文字打つたびにAPIを叩く」のは実務では避けたい設計 ——
// サーバに無駄な負荷をかけるし、レスポンスが返る順番も保証されない
// (「あ」→「あい」→「あいう」と打ったのに「あ」の結果が最後に返ってきて
// 画面が巻き戻る、というバグの温床になる)。そこで「入力が止まってから
// 一定時間(例: 300ms)経ったら初めて検索する」というデバウンスを使う。
//
// C#で言えば、System.Timers.Timer を使い、キー入力のたびに前のタイマーを
// Stop してから新しいタイマーを Start し直す(最後の入力から一定時間
// 何も起きなければ発火する)のと同じ発想。Reactではこれを「前回の
// useEffectで仕掛けたタイマーを片付けてから、新しいタイマーを仕掛け直す」
// という形で書く。useEffectのコールバックがreturnする関数(クリーンアップ
// 関数)は、「次にこのuseEffectが再実行される直前」と「コンポーネントが
// 画面から消えるとき」の両方で自動的に呼ばれる。
//
// 「制御コンポーネント」とは、inputに今表示されている値をReact側のstateが
// 一元管理する形(C#のWPFで<TextBox Text="{Binding Query}"/>のように
// 双方向バインディングするイメージに近いが、Reactは「stateが正、DOMの
// 表示はその写像」という片方向の流れになる)。
import { useEffect, useState, type ReactElement } from "react";

export const DEFAULT_DEBOUNCE_MS = 300;

export type SearchBoxProps = {
  /** デバウンス後に(検索語を1つ引数にして)呼ばれるコールバック */
  onSearch: (query: string) => void;
  /** デバウンス待機時間(ミリ秒)。省略時は DEFAULT_DEBOUNCE_MS */
  debounceMs?: number;
  /** 入力欄の初期値。省略時は空文字 */
  initialQuery?: string;
};

// SearchBox: 入力欄の表示値をstateで管理し(制御コンポーネント)、
// 入力が止まってから debounceMs 経過したときだけ onSearch を呼び出す。
//
// TODO: 以下を満たすように実装する
//   1. 入力欄の現在値を表すstateを持つ(初期値は initialQuery、省略時は空文字)
//   2. <input> の value にそのstateを渡し、onChange のたびに新しい値を
//      そのstateへ反映する(これでReactのstateとDOM上の表示値が常に
//      一致する「制御コンポーネント」になる)
//   3. state(検索語)が変わるたびに実行されるuseEffectを1つ書く。その中で
//      setTimeoutを使い、debounceMsミリ秒後にonSearch(state)を呼ぶ。
//      useEffectのコールバックからクリーンアップ関数(clearTimeoutを呼ぶ
//      関数)をreturnし、前回仕掛けたタイマーが次の入力のたびに確実に
//      キャンセルされるようにする(これを忘れると、入力を続けている間も
//      古いタイマーが生き残り、onSearchが何度も呼ばれてしまう)
//   4. アクセシブルな名前を付けた<input>を返す。テストは
//      screen.getByRole("textbox", { name: "検索" }) で要素を探す
// 使うAPI・書き方に迷ったら hints/ex01.md を見る
export function SearchBox({
  onSearch,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  initialQuery = "",
}: SearchBoxProps): ReactElement {
  throw new Error("TODO: 未実装");
}
