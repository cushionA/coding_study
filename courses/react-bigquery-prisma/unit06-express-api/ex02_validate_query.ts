// ex02_validate_query: 入口でzodによるクエリパラメータ検証を行う
// ASP.NET Coreの[Required]や[Range(1,100)]といったDataAnnotationsによる
// モデルバインディング検証をイメージするとよい。Expressにはモデルバインディングが
// 存在しないので、req.query(中身はすべて文字列かstring[]かundefined)を
// 自分でzodスキーマに通し、失敗したら400を返し、成功したら次のハンドラに
// 正しい型に変換済みの値を渡す、という処理を自分で書く必要がある。
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

// クエリパラメータはURLの一部なので必ず文字列で届く("3"のように)。
// z.coerce.number() は文字列を数値に変換してから検証してくれる
// (C#の int.TryParse を検証パイプラインの中に埋め込むイメージ)。
export const booksQuerySchema = z.object({
  q: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type BooksQuery = z.infer<typeof booksQuerySchema>;

// Expressのミドルウェアは (req, res, next) => void という形の関数。
// 検証に成功したら res.locals.booksQuery に変換済みの値を詰めて next() を呼び、
// 失敗したら 400 + 理由 を返して next() は呼ばない(そこでパイプラインを止める =
// ASP.NET Coreのミドルウェアで await next() を呼ばないのと同じ意味)。
export function validateBooksQuery(req: Request, res: Response, next: NextFunction): void {
  // TODO: booksQuerySchema.safeParse(req.query) を呼ぶ。
  // 成功していれば(result.success === true) res.locals.booksQuery = result.data
  // としてから next() を呼ぶ。失敗していれば next() を呼ばずに
  // res.status(400).json({ error: "invalid query", issues: result.error.issues }) を返す
  throw new Error("TODO: 未実装");
}

// このミドルウェアを実際にHTTPレベルでテストできるよう、最小限のアプリを組み立てる
// (このcreateAppはすでに完成しているので変更しなくてよい)。
export function createApp(): Express {
  const app = express();
  app.get("/api/books", validateBooksQuery, (req: Request, res: Response) => {
    // ここに到達した時点で res.locals.booksQuery には検証・変換済みの値が入っている
    res.json(res.locals.booksQuery as BooksQuery);
  });
  return app;
}
