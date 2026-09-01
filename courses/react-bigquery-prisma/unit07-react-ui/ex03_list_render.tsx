// ex03_list_render: 配列をmapで一覧描画し、keyの意味を理解する
//
// C#で `books.Select(b => new BookRow(b))` のようにLINQで変換するのと同じ発想で、
// Reactでは配列を `.map()` でJSX要素の配列に変換して描画する。
// 違うのは「配列の各要素にkeyという特別な目印を付ける」必要があること。
import type { ReactElement } from "react";

export type Book = { id: number; title: string; author: string };

export const EMPTY_MESSAGE = "登録された本はありません";

// getBookKey: リストの各要素に付けるkeyを作るヘルパー。
//
// Reactは配列を再描画するとき、keyを使って「前回のどの要素と今回のどの要素が
// 同じものか」を追跡する。もしkeyにindex(0, 1, 2, ...)を使うと、真ん中の要素を
// 削除したり並び替えたりしたときに全要素が「別物」だと誤認識され、
// 入力中のフォーム値やアニメーションの状態がズレる、という不具合の元になる
// (C#で言えば `ObservableCollection` の要素をIndexだけで同一性判定するようなもの)。
// だから「データ自体が持つ、要素ごとに変わらないID」をkeyにするのが正しい。
//
// TODO: このBook型が持つフィールドのうち「要素ごとに変わらない目印」になる
// ものを、Reactのkeyが受け付ける型(string)に揃えて返す
export function getBookKey(book: Book): string {
  throw new Error("TODO: 未実装");
}

export type BookListProps = { books: Book[] };

// BookList: 本の一覧を表示する。
// TODO: 以下を満たすコンポーネントにする
//   - books が空配列なら EMPTY_MESSAGE を1つの文として表示する
//   - そうでなければ一覧として、book ごとに「タイトル — 著者名」の形式
//     (間は半角スペース+em dash「—」+半角スペース)で1行ずつ表示する。
//     各行の目印(key)には getBookKey(book) を使う
// 具体的なタグの選び方・書き方に迷ったら hints/ex03.md を見る
export function BookList({ books }: BookListProps): ReactElement {
  throw new Error("TODO: 未実装");
}
