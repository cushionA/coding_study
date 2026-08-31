// ex02_zod_schema: zodでランタイム検証を行う
// TypeScriptの型注釈は実行前にすべて消去される(コンパイル時にしか存在しない)。
// だから「fetchで取ってきたJSONに as BookApiDto と書けば安全」というのは幻想で、
// 実際のJSONの形が約束と違っても実行時には誰も止めてくれない。zodはその隙間を
// 埋めるライブラリで、スキーマ(データの形の設計図)を定義し、実行時に safeParse
// で検証する。C#のDataAnnotations + TryValidateObjectに近いが、決定的に違うのは
// 「TSの型がスキーマから自動で生える」(z.infer)点。
import { z } from "zod";
import type { BookApiDto } from "./ex01_parse_response";

// BookApiDtoと同じ形のスキーマを組み立てる。
// モジュール読み込み時ではなく、呼び出された瞬間に評価されるよう
// 関数の中に隠してある(トップレベルで組み立てて失敗するとimport自体が壊れるため)。
function buildBookDtoSchema(): z.ZodType<BookApiDto> {
  return z.object({
    book_id: z.number(),
    book_title: z.string().min(1),
    author_name: z.string().min(1),
    publish_year: z.number().nullable(),
  });
}

// 検証エラーを表す専用の例外クラス。
// C#で言えば独自の例外型を定義し catch (ValidationException ex) のように
// 種類で判定できるようにするのと同じ発想(ex04で通信エラーと区別するのに使う)。
export class ResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResponseValidationError";
  }
}

// 検証結果を表す判別共用体型。C#のTryParseパターンに近い
// (成功/失敗をboolと出力引数で表す代わりに、成功時/失敗時で持っている
// プロパティ自体を変える)。
export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

// unknown(何が来るか分からない生JSON)を1件のBookApiDtoとして検証する。
export function parseBookDto(raw: unknown): ParseResult<BookApiDto> {
  const result = buildBookDtoSchema().safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, error: result.error.message };
}

// 複数件のBookApiDtoをまとめて検証する(1件でも形が違えば全体を失敗扱いにする)。
export function parseBookDtoList(raw: unknown): ParseResult<BookApiDto[]> {
  const result = z.array(buildBookDtoSchema()).safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, error: result.error.message };
}
