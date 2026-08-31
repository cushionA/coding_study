// ex04_capstone: fetch注入+リトライ+zod検証+DTO変換を1つの非同期関数にまとめる
// unit01のfetchJsonをさらに堅牢にしたバージョン: ①リトライ(ex03) ②実行時検証(ex02)
// ③ドメインモデルへの変換(ex01)、という3段階を組み合わせる。
// 実務の「外部APIから取得したデータを保存する」処理の入口は、たいていこの形になる。

import { toBooks, type Book } from "./ex01_parse_response";
import { parseBookDtoList, ResponseValidationError } from "./ex02_zod_schema";
import { fetchWithRetry, type FetchLike, type RetryOptions } from "./ex03_retry_timeout";

// urlからリトライ付きで生JSONを取得し、zodで検証し、Book[]に変換する。
// 検証に失敗した場合は ResponseValidationError を throw する
// (通信の失敗=Errorと区別できるように、専用のエラー型を使う)。
export async function fetchBooksRobustly(
  fetchFn: FetchLike,
  url: string,
  options?: RetryOptions,
): Promise<Book[]> {
  // TODO: ① fetchWithRetry<unknown>(fetchFn, url, options) で生JSONを取得する
  // ② parseBookDtoList で検証する。ok:false なら ResponseValidationError を
  //   (検証エラーの内容を含めて)throw する。ok:true ならそのdataを
  //   toBooks に渡して Book[] を return する
  throw new Error("TODO: 未実装");
}

// 呼び出し側がtry/catchを書かなくて済むように、成功/失敗を戻り値の形で表す版。
// 「検証エラー(相手のデータが壊れている)」と「通信エラー(リトライしても
// 取得できなかった)」を reason で区別できるようにする。
export type FetchBooksResult =
  | { ok: true; books: Book[] }
  | { ok: false; reason: "validation" | "network"; message: string };

export async function fetchBooksSafely(
  fetchFn: FetchLike,
  url: string,
  options?: RetryOptions,
): Promise<FetchBooksResult> {
  // TODO: fetchBooksRobustly を try/catch で包む。成功したら { ok: true, books }。
  // 失敗したら、catchしたerrorが ResponseValidationError のインスタンスなら
  // reason: "validation"、そうでなければ reason: "network" として
  // { ok: false, reason, message } を返す(messageはerrorのmessageプロパティ)
  throw new Error("TODO: 未実装");
}
