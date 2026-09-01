// ex01_first_route: Expressで最初のGETエンドポイントを2本作る
// ASP.NET Coreで [HttpGet("api/books")] と [HttpGet("api/books/{id}")] を持つ
// Controllerを1つ書くのに近い。ただしExpressにはControllerクラスという概念がなく、
// `app.get(パス, ハンドラ)` のように「パス→処理する関数」を1本ずつ登録していく
// (C#の属性ルーティングと違い、ルーティングテーブルを自分の手で組み立てるイメージ)。
import express, { type Express, type Request, type Response } from "express";

export type Book = { id: number; title: string; author: string };

// この演習では実DBを使わず、メモリ上の配列をデータソースとして使う
// (本物ならここがPrisma経由のDBアクセスに置き換わる)。
export const books: Book[] = [
  { id: 1, title: "実践TypeScript入門", author: "佐藤" },
  { id: 2, title: "Express実戦ガイド", author: "鈴木" },
  { id: 3, title: "Prismaで作るWebアプリ", author: "田中" },
];

// idからBookを探すヘルパー。req.params.idは常に文字列(URLの一部だから)なので、
// 数値に変換してから比較する必要がある。ASP.NET Coreの[FromRoute] int idでは
// フレームワークが自動で変換してくれるが、Expressではこの変換は自分で書く。
export function findBookById(id: number): Book | undefined {
  return books.find((b) => b.id === id);
}

// 一覧を返すハンドラ。
export function listBooksHandler(req: Request, res: Response): void {
  res.json(books);
}

// 1件を返すハンドラ。
export function getBookHandler(req: Request, res: Response): void {
  const id = Number(req.params.id);
  const book = findBookById(id);
  if (!book) {
    res.status(404).json({ error: "book not found" });
    return;
  }
  res.json(book);
}

// createApp: アプリ本体(ルーティングテーブル)を組み立てて返す関数。
// テストはこれを呼び出してsupertestに渡すだけでよく、実際にポートをlistenする
// 必要はない(supertestはExpressアプリを直接受け取って擬似リクエストを送れる)。
export function createApp(): Express {
  const app = express();
  app.get("/api/books", listBooksHandler);
  app.get("/api/books/:id", getBookHandler);
  return app;
}
