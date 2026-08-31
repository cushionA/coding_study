// ex03_env_config: 環境変数を安全に読む(env-secret-boundary)
// APIキーやDB接続情報は「.env ファイル + process.env」で読み込み、
// ソースコードやフロントエンドのバンドルには絶対に書かない。
// C#で言えば appsettings.json + 環境変数によるオーバーライドに近いが、
// 決定的に違うのは process.env[key] の型が `string | undefined` であること
// (C#の ConfigurationManager もnull許容だが、TSはコンパイラが強制的に
// undefinedの可能性を意識させてくる)。この undefined を握りつぶさずに
// 「デフォルト値」か「即座にエラー」のどちらかで安全に処理する練習をする。

// key を読み、未設定(undefined)なら defaultValue を返す。
// 空文字列が明示的に設定されている場合は「設定されている」として
// そのまま返す(undefined と "" は別物として扱う)。
export function getEnvOrDefault(key: string, defaultValue: string): string {
  // TODO: process.env[key] を読み、undefined のときだけ defaultValue を使う
  // ヒント: Null合体演算子 `??` はC#の `??` と同じで、undefined/null のときだけ右側を使う
  throw new Error("TODO: 未実装");
}

// key を読み、未設定または空文字列なら Error を throw する「必須の秘密情報」用。
// APIキーのような値はデフォルト値でごまかさず、無ければ即座に落とすのが安全。
export function getRequiredEnv(key: string): string {
  // TODO: process.env[key] を読み、undefined または "" なら
  // `環境変数 ${key} が設定されていません` という Error を throw する。
  // それ以外はそのまま返す。
  throw new Error("TODO: 未実装");
}

// key を読み、正の整数として解釈して返す(未設定なら defaultValue)。
// パースに失敗した場合や 0以下の場合は Error を throw する。
export function parsePositiveIntEnv(key: string, defaultValue: number): number {
  // TODO: process.env[key] が undefined なら defaultValue をそのまま返す。
  // 設定されていれば Number(...) でパースし、整数でない/0以下なら
  // `環境変数 ${key} は正の整数である必要があります` という Error を throw する。
  throw new Error("TODO: 未実装");
}

// アプリが使うAPI関連設定をまとめて読み込む。
export type ApiConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
};

export function loadApiConfig(): ApiConfig {
  // TODO: 上の3関数を組み合わせて ApiConfig を組み立てて返す。
  // - baseUrl: getEnvOrDefault("API_BASE_URL", "http://localhost:4010")
  // - apiKey: getRequiredEnv("API_KEY")(秘密情報なのでデフォルト値を持たせない)
  // - timeoutMs: parsePositiveIntEnv("API_TIMEOUT_MS", 5000)
  throw new Error("TODO: 未実装");
}
