// ex02_write_model: schema.prisma の model ブロックを「文字列として組み立てる」練習。
// ex01が「読む」だったのに対し、こちらは「要件から書く」側。実務でも最初は
// 要件(欲しい一覧画面・検索条件)から model を起こす作業から始まる。
// ここでもまだ Prisma CLI は起動しない(組み立てた文字列が本物のschemaとして
// 正しい形になっているかを、文字列比較で確認する)。

// 1フィールド分の定義情報。
// C#で言えば、EF Core の Fluent API で1プロパティ分の設定を表す
// オブジェクトに近い(Name / Type / IsRequired 等をまとめたもの)。
export type FieldDef = {
  name: string;
  type: string;
  optional?: boolean;
  // 例: ["@id", "@default(autoincrement())"] や ["@unique"]
  attributes?: string[];
};

// 1フィールド分を schema.prisma のフィールド定義行(インデント2スペース)に変換する。
// 期待するフォーマット:
//   属性なし・必須:        "  title String"
//   属性なし・null許容:    "  rating Float?"
//   属性あり:              "  id Int @id @default(autoincrement())"
//   null許容+属性あり:     "  isbn String? @unique"
// (属性が複数ある場合は半角スペース区切りで並べる)
export function buildFieldLine(field: FieldDef): string {
  // TODO: name, type(?付き), attributes を上記フォーマットの順で組み立てて返す。
  // attributes が未指定 または 空配列のときは、属性部分を一切付けないこと。
  throw new Error("TODO: 未実装");
}

// model ブロック全体を組み立てる。期待するフォーマット(改行区切り):
//   model <modelName> {
//     <buildFieldLineの結果を1行ずつ>
//   }
export function buildModelBlock(modelName: string, fields: FieldDef[]): string {
  // TODO: `model ${modelName} {` から始まり、fields を buildFieldLine で
  // 変換した行を改行でつなぎ、最後に `}` で閉じる文字列を組み立てる
  throw new Error("TODO: 未実装");
}

// 複数フィールドにまたがる @@index([...]) の行を組み立てる。期待するフォーマット:
//   @@index([author])            (1フィールドの場合)
//   @@index([author, title])     (複数フィールドの場合、", "区切り)
// (インデント2スペース付き)
export function buildIndexLine(fieldNames: string[]): string {
  // TODO: fieldNames を ", " で結合し、"  @@index([...])" の形にする
  throw new Error("TODO: 未実装");
}
