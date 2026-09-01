// ex04_capstone: useEffectでAPIを取得し、ローディング/エラー/空/成功を出し分ける
//
// unit01/unit02で作った「fetchを引数で注入する」パターン(FetchLike)をReactに持ち込む。
// テストでは本物のネットワークの代わりに、fake な fetchBooks 関数を props で渡す。
// これで外部通信ゼロのまま「APIから取得する一覧画面」の振る舞いをテストできる。
//
// C#で言うなら、WPFの画面が Loaded イベントで非同期にデータを取得し、
// IsLoading / ErrorMessage / Items をバインドして出し分けるのに近い。
// Reactではこれを「今どの状態か」を表す1つの状態(state)として持ち、
// useEffect で「マウントされたら1回だけfetchする」という副作用を書く。
import { useEffect, useState, type ReactElement } from "react";

export type Book = { id: number; title: string; author: string };

// FetchBooks: 本物のfetchも、fake実装も、この形の関数なら何でも受け取れる。
export type FetchBooks = () => Promise<Book[]>;

export const LOADING_TEXT = "読み込み中...";
export const EMPTY_TEXT = "本が見つかりませんでした";

// 「今どの状態か」を1つの型で表現する。ローディング中はbooksを持たず、
// エラー時はmessageを持ち、成功時だけbooksを持つ、というように
// 状態ごとに持てるデータを型で縛るのがポイント(C#のUnion型に相当するものが
// TypeScriptにはなく、こういう「タグ付き合併(discriminated union)」で表現する)。
export type BookListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; books: Book[] };

export type BookExplorerProps = {
  fetchBooks: FetchBooks;
};

// BookExplorer: マウント時に fetchBooks を呼び出し、結果に応じて
// ローディング / エラー / 空 / 成功 の4状態を出し分ける一覧コンポーネント。
//
// TODO: 以下を満たすように実装する
//   1. state(型は BookListState、初期状態はローディング中)を持つ
//   2. マウント時に1回だけ、propsで受け取った fetchBooks を呼び出す副作用を書く。
//      成功したら成功状態へ、失敗したらエラーメッセージ付きの状態へ遷移する
//      (エラーの値が Error インスタンスかどうかで message の取り出し方が変わる)
//   3. state.status に応じて、ローディング中 / エラー(role="alert"付きで
//      エラー内容を表示) / 空 / 一覧表示、の4通りを出し分ける。一覧の各行は
//      ex03と同様に一意な目印(key)を持たせる
// 使うAPI・書き方に迷ったら hints/ex04.md を見る
export function BookExplorer({ fetchBooks }: BookExplorerProps): ReactElement {
  throw new Error("TODO: 未実装");
}
