// ex04_capstone: 検索入力(ex01) と 検索エンドポイント(ex03) を1画面に結線する
//
// ここまでの3課題を実際にユーザーが触れる形にまとめる、このユニットの
// 総仕上げ。SearchBox(ex01)がデバウンス後に確定させた検索語を受け取り、
// searchBooksWithSummary相当の関数(ex03)を呼び出し、一覧とサマリを
// 画面に反映する。本番であれば searchBooks の中身は「バックエンドAPIへの
// fetch」になるが、ここではその関数自体をpropsで注入するので、外部通信は
// 一切発生しない(unit07で学んだ「fake実装を注入してUIをテストする」の
// 総仕上げでもある)。
//
// 状態遷移は次の4つ(unit07のBookExplorerと同じ「今どの状態か」を1つの
// 値で表す設計):
//   idle    : まだ何も検索していない(検索語が空の間はこの状態に留まる)
//   loading : searchBooksを呼び出し中
//   error   : searchBooksが失敗した(one覧の根拠が無いので画面全体をエラー表示)
//   success : 一覧(とサマリ)を表示できる状態
import { useState, type ReactElement } from "react";
import { SearchBox, DEFAULT_DEBOUNCE_MS } from "./ex01_search_input";
import type { SearchResponse } from "./ex03_search_endpoint";

// 本番ではバックエンドAPIへのfetchになる関数。テストではfakeを注入する。
export type SearchBooks = (keyword: string) => Promise<SearchResponse>;

export type SearchPageProps = {
  searchBooks: SearchBooks;
  debounceMs?: number;
};

export const IDLE_TEXT = "検索語を入力してください";
export const LOADING_TEXT = "検索中...";
export const NO_RESULTS_TEXT = "本が見つかりませんでした";
export const SUMMARY_UNAVAILABLE_TEXT = "著者別集計は利用できません";

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; response: SearchResponse };

// SearchPage: SearchBoxで検索語を受け取り、searchBooksを呼び出して
// 一覧とサマリを出し分ける。
//
// TODO: 以下を満たすように実装する
//   1. 表示状態を表すstate(型はPageState、初期状態は idle)を持つ
//   2. SearchBoxのonSearchに渡すハンドラを作る:
//      - 受け取った検索語(keyword)が空文字なら state を idle に戻す
//      - 空文字でなければ、まず state を loading にし、続けて
//        props で受け取った検索関数にその検索語を渡して呼び出す。成功したら
//        { status: "success", response } に、失敗したら
//        { status: "error", message } に遷移する
//        (エラーの値がErrorインスタンスかどうかでmessageの取り出し方が変わる)
//   3. 画面には常にSearchBox(props: onSearch=上のハンドラ, debounceMs)を
//      表示し、その下にstate.statusに応じて次を出し分ける:
//      - idle   : IDLE_TEXT を表示
//      - loading: LOADING_TEXT を表示
//      - error  : role="alert" を付けてmessageを表示
//      - success: response.items が空なら NO_RESULTS_TEXT を表示。
//        1件以上ならタイトルの一覧(各行に一意なkeyを付ける)を表示し、
//        response.summary があれば著者別件数も表示、無ければ
//        (degradeしているので) SUMMARY_UNAVAILABLE_TEXT を表示する
// 使うAPI・書き方に迷ったら hints/ex04.md を見る
export function SearchPage({ searchBooks, debounceMs = DEFAULT_DEBOUNCE_MS }: SearchPageProps): ReactElement {
  throw new Error("TODO: 未実装");
}
