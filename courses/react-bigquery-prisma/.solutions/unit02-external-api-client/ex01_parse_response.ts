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
  return {
    id: dto.book_id,
    title: dto.book_title.trim(),
    author: dto.author_name.trim(),
    publishYear: dto.publish_year,
  };
}

// 複数件のDTOをまとめてBookの配列に変換する。
export function toBooks(dtos: BookApiDto[]): Book[] {
  return dtos.map(toBook);
}

// ドメインモデル側で著者名(大文字小文字を無視)から検索する。
// DTOのままだとtrim/大文字小文字が揃っていないので、変換後だからこそ書ける処理。
export function booksByAuthor(books: Book[], author: string): Book[] {
  const target = author.trim().toLowerCase();
  return books.filter((b) => b.author.toLowerCase() === target);
}
