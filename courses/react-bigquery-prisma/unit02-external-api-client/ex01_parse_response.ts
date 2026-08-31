// ex01_parse_response: 外部APIの生JSON(DTO)をアプリ内のドメインモデルへ変換する
// 外部のWeb APIはよく snake_case のキー(book_id, book_title, author_name)を
// 返してくる。TypeScriptのプロパティ名はcamelCaseが慣習なので、境界(APIクライアント)
// で一度だけ変換し、アプリの内側は常にきれいな形(Book型)だけを見るようにする。
// C#で言えば、外部サービスのレスポンスDTOクラスと自社ドメインのエンティティクラスを
// 分けてAutoMapperで変換するのと同じ発想。ここでは手書きの変換関数を書く。

// 外部APIがそのまま返してくる形(境界の外側)。
export type BookApiDto = {
  book_id: number;
  book_title: string;
  author_name: string;
  publish_year: number | null;
};

// アプリの内側で使うドメインモデル(境界の内側)。camelCaseで統一する。
export type Book = {
  id: number;
  title: string;
  author: string;
  publishYear: number | null;
};

// 1件のDTOをBookに変換する。
// 外部APIは前後に空白が混じったデータを返すことがあるため、
// title/author は trim() して正規化する(境界でデータを「掃除」する)。
export function toBook(dto: BookApiDto): Book {
  // TODO: dto の各プロパティを Book の形(id/title/author/publishYear)に
  // マッピングして返す。title と author は trim() で前後の空白を取り除くこと。
  throw new Error("TODO: 未実装");
}

// 複数件のDTOをまとめてBookの配列に変換する。
export function toBooks(dtos: BookApiDto[]): Book[] {
  // TODO: 上で作った toBook を使って dtos を変換する(ループを自分で書く必要はない)
  throw new Error("TODO: 未実装");
}

// ドメインモデル側で著者名(大文字小文字を無視)から検索する。
// DTOのままだとtrim/大文字小文字が揃っていないので、変換後だからこそ書ける処理。
export function booksByAuthor(books: Book[], author: string): Book[] {
  // TODO: author を trim + 小文字化した値をキーにして、
  // books の中から author が(大文字小文字を無視して)一致するものだけを返す
  throw new Error("TODO: 未実装");
}
