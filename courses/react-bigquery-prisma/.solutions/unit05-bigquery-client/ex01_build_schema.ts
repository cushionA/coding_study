// ex01_build_schema: 分析したい問いから、BigQueryのテーブルスキーマを組み立てる
// BigQueryのテーブルは事前にスキーマ(列名・型・NULL許容)を決めてから作る。
// C#で言えば、EF Coreのモデルクラス+マイグレーションでテーブル定義を決めるのに
// 近いが、BigQueryのスキーマはクラスではなく「フィールド定義の配列」という
// 素朴なデータ構造で表す(実際の`bigquery.dataset(id).createTable(id, {schema})`に
// そのまま渡す形)。このユニットは実GCPには一切繋がず、この配列を正しく
// 組み立てられることをテストで確認する。

// アプリ側で使う簡略化した型名(BigQueryの型名を直接書く前段階)。
// 実務でよく使う5種類だけに絞ってある。
export type FieldType = "string" | "int" | "float" | "boolean" | "timestamp";

// BigQueryが実際に受け取る型名。
export type BigQueryFieldType = "STRING" | "INT64" | "FLOAT64" | "BOOL" | "TIMESTAMP";

// mode: REQUIRED=NOT NULL相当、NULLABLE=NULL許容、REPEATED=配列(このユニットでは使わない)。
export type SchemaField = {
  name: string;
  type: BigQueryFieldType;
  mode: "REQUIRED" | "NULLABLE" | "REPEATED";
};

// アプリ側で列を定義するときの入力形。nullableを省略した場合はREQUIRED扱いにする。
export type FieldSpec = {
  name: string;
  type: FieldType;
  nullable?: boolean;
};

const FIELD_TYPE_MAP: Record<FieldType, BigQueryFieldType> = {
  string: "STRING",
  int: "INT64",
  float: "FLOAT64",
  boolean: "BOOL",
  timestamp: "TIMESTAMP",
};

// FieldType → BigQueryの型名への対応表。
// C#で言えば int→INT64, double→FLOAT64, string→STRING, bool→BOOL,
// DateTime→TIMESTAMPという、ADO.NETの型マッピングに近い発想。
export function mapFieldType(type: FieldType): BigQueryFieldType {
  return FIELD_TYPE_MAP[type];
}

// 1列分のFieldSpecをBigQueryのSchemaFieldに変換する。
export function buildSchemaField(spec: FieldSpec): SchemaField {
  return {
    name: spec.name,
    type: mapFieldType(spec.type),
    mode: spec.nullable ? "NULLABLE" : "REQUIRED",
  };
}

// 複数列をまとめて、テーブル全体のスキーマ(SchemaField[])に変換する。
export function buildTableSchema(specs: FieldSpec[]): SchemaField[] {
  return specs.map(buildSchemaField);
}

// 「著者別に何冊あるか」を集計する分析テーブルのスキーマを組み立てる、実務でよくある形。
// author: 必須の文字列 / bookCount: 必須の整数 /
// lastIngestedAt: NULL許容のタイムスタンプ(まだ一度も取り込んでいない著者行はあり得る)。
export function buildAuthorSummarySchema(): SchemaField[] {
  return buildTableSchema([
    { name: "author", type: "string" },
    { name: "bookCount", type: "int" },
    { name: "lastIngestedAt", type: "timestamp", nullable: true },
  ]);
}
