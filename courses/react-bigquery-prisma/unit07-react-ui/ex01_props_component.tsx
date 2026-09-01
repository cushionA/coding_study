// ex01_props_component: propsを受け取って表示するだけの、最初の関数コンポーネント
//
// C#の `record BookCardProps(string Title, string Author)` を受け取り、中身を
// 書き換えずにそのまま画面に出す「読み取り専用ビュー」に近い。WPFなら
// `<TextBlock Text="{Binding Title}" />` のようなバインディングの世界だが、
// Reactでは「propsを受け取ってJSXを返す関数」として書く。これがReactコンポーネントの
// 最小単位で、以降のuseState/useEffectもすべてこの形の関数の中で使っていく。
//
// JSXは見た目はHTMLに似ているが、実体はJavaScript(TypeScript)の式。
// `{}` の中には普通の式を埋め込める(C#の文字列補間 `$"著者: {author}"` に近い感覚)。
import type { ReactElement } from "react";

export type BookCardProps = {
  title: string;
  author: string;
};

// BookCard: title を見出し(h3)として、author を「著者: 」を付けた文章として表示する。
// 戻り値の型 ReactElement は「JSXの式が表す値」の型(C#で言えばUIElementのようなもの)。
//
// TODO: 以下の要件を満たすJSXを return する
//   1. <h3> の中に title をそのまま表示する
//   2. <p> の中に "著者: " + author という文字列を表示する
//   (JSXはルート要素が1つでなければならないので、両方を <div> などでまとめること)
export function BookCard({ title, author }: BookCardProps): ReactElement {
  throw new Error("TODO: 未実装");
}
