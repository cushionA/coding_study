// ex04_capstone: route → service → repository の3層構成
// ASP.NET Coreで言えば Controller(HTTPとの変換だけ) → Service(ビジネスロジック)
// → Repository(データの出し入れだけ) という定番の3層構造そのもの。
// この分離のご利益は「repositoryだけ差し替えれば、本物のDB(Prisma)なしで
// HTTPレベルのテストが書ける」こと。このexerciseではメモリ上で動くfake実装
// (FakeBookRepository)をテストから注入する。
import express, {
  type ErrorRequestHandler,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod";

export type Book = { id: number; title: string; author: string };

// --- repository層: データの出し入れだけを知っている。
// 検索条件を絞り込んだりページングしたりのビジネスロジックはここに書かない
// (それはservice層の仕事。repositoryはあくまで「全部くれ」「idで1件くれ」しか
// 知らない、単純な窓口にしておく)。
export interface BookRepository {
  findAll(): Promise<Book[]>;
  findById(id: number): Promise<Book | null>;
}

// テスト・ローカル開発用のfake実装(本物のPrisma版Repositoryの代わり)。
// 実務でも「本物と同じinterfaceを実装したメモリ版」をテストに差し込むのは
// よくあるパターン(C#でIRepositoryをMoq/NSubstituteでモックする代わりに、
// 手書きの実クラスを使うイメージ)。これは完成済みなので変更しなくてよい。
export class FakeBookRepository implements BookRepository {
  constructor(private readonly books: Book[]) {}

  async findAll(): Promise<Book[]> {
    return this.books;
  }

  async findById(id: number): Promise<Book | null> {
    return this.books.find((b) => b.id === id) ?? null;
  }
}

// --- 既知のエラー型(ex03と同じ発想。routeやserviceは投げっぱなしにし、
// 変換は集中エラーハンドラに任せる)。
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

const listQuerySchema = z.object({
  q: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
type ListQuery = z.infer<typeof listQuerySchema>;

export type BookListResult = { items: Book[]; total: number; page: number; pageSize: number };

// --- service層: 検索・ページング・存在チェックといったビジネスロジックを持つ。
// repositoryの具体的な中身(Prismaかfakeか)は知らず、BookRepositoryという
// interfaceにだけ依存する(C#でDIコンテナに登録したServiceがIRepositoryだけを
// 知っているのと同じ発想。差し替え可能性はここから生まれる)。
export function createBookService(repo: BookRepository) {
  async function listBooks(query: ListQuery): Promise<BookListResult> {
    // TODO: ① repo.findAll() で全件取得する
    // ② query.q が指定されていたら、title または author に(大文字小文字を
    //   無視して)部分一致するものだけに絞り込む
    // ③ 絞り込み後の件数を total として覚えておく
    // ④ query.page / query.pageSize でページングする(Array.slice を使う。
    //   1ページ目の開始位置は (page - 1) * pageSize)
    // ⑤ { items, total, page: query.page, pageSize: query.pageSize } を返す
    throw new Error("TODO: 未実装");
  }

  async function getBook(id: number): Promise<Book> {
    // TODO: repo.findById(id) を呼ぶ。見つからなければ
    // NotFoundError(`book ${id} not found`) をthrowし、見つかればそれをreturnする
    throw new Error("TODO: 未実装");
  }

  return { listBooks, getBook };
}

export type BookService = ReturnType<typeof createBookService>;

// --- 集中エラーハンドラ(ex03と同じ)。すでに完成しているので変更しなくてよい。
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "internal server error" });
};

// --- route層: HTTPとservice層をつなぐだけで、ビジネスロジックは書かない。
// repositoryを外から注入できるようにしておくと、本番では本物のPrisma版を、
// テストではFakeBookRepositoryを渡せる(依存性の注入)。
export function createApp(repo: BookRepository): Express {
  const app = express();
  const service = createBookService(repo);

  app.get("/api/books", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(new ValidationError(parsed.error.issues.map((i) => i.message).join(", ")));
      return;
    }
    // TODO: service.listBooks(parsed.data) を呼び、その結果をそのまま
    // res.json(...) で返す(Express 5はasyncハンドラの中でthrow/rejectされた
    // 例外を自動的にnext(err)へ回すので、ここではtry/catchを書かなくてよい)
    throw new Error("TODO: 未実装");
  });

  app.get("/api/books/:id", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new ValidationError(`id must be an integer, got "${req.params.id}"`);
    }
    // TODO: service.getBook(id) を呼び、その結果を res.json(...) で返す
    throw new Error("TODO: 未実装");
  });

  app.use(errorHandler);
  return app;
}
