// ex03_error_layering: 集中エラーハンドリングミドルウェアを1箇所に置く
// ASP.NET Coreの UseExceptionHandler ミドルウェア(パイプラインの最後に置き、
// どのControllerで例外が起きても一箇所でキャッチしてレスポンスに変換する)に相当する。
// Express 5では、ルートハンドラの中でthrowされた例外(async関数ならrejectされた
// Promiseも含む)は自動的にこの集中エラーハンドラへ回される。だから各ルートは
// 「失敗したらthrowするだけ」でよく、res.status(...)をルート側に書く必要がない
// (レスポンスの組み立ては全部エラーハンドラに任せる、という役割分担)。
import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

// 「クライアントの入力が悪い」ことを表す既知のエラー型(400として返してよい)。
// C#で言えば ArgumentException のような、呼び出し側のミスを表す専用の例外クラス。
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// 「探したが存在しなかった」ことを表す既知のエラー型(404として返してよい)。
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export const books = [
  { id: 1, title: "実践TypeScript入門" },
  { id: 2, title: "Express実戦ガイド" },
];

// 集中エラーハンドリングミドルウェア(このexerciseの主役)。
// Expressは「引数が4つの関数」を特別扱いしてエラーハンドラとして認識する
// ((err, req, res, next) の順番・個数を必ず守ること。3つ以下だと普通の
// ミドルウェアとして扱われエラーを受け取れない)。
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  // 想定外のエラー: 詳細はログにだけ出し、レスポンスには汎用メッセージのみ返す
  console.error(err);
  res.status(500).json({ error: "internal server error" });
};

export function createApp(): Express {
  const app = express();

  app.get("/api/books/:id", (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      // レスポンスをここで組み立てず、投げっぱなしにする。
      // どう400に変換するかはerrorHandler側の責務。
      throw new ValidationError(`id must be an integer, got "${req.params.id}"`);
    }
    const book = books.find((b) => b.id === id);
    if (!book) {
      throw new NotFoundError(`book ${id} not found`);
    }
    res.json(book);
  });

  // わざと想定外の例外(バグ)を起こすルート。テストで500経路を確認するために使う。
  // 実際のスタックトレースや接続文字列のような機密情報がここに含まれていても、
  // レスポンスには絶対に出してはいけない、という状況を再現している。
  app.get("/api/boom", () => {
    throw new Error("something exploded internally: db password=hunter2");
  });

  // 集中エラーハンドラは必ずルート登録の"あと"に app.use() すること
  // (登録順が違うと、エラーが起きた時にこのハンドラまで届かない)。
  app.use(errorHandler);

  return app;
}
