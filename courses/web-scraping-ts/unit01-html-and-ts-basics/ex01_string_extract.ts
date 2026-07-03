// ex01_string_extract: 文字列操作の基本(trim/split/replace/テンプレートリテラル)
// スクレイピングで拾った生のHTML文字列は前後に空白や改行が混じっていることが多い。
// cheerioを使う前に、まずはTypeScript標準の文字列メソッドで素朴な処理に慣れる。
// C#の string.Trim() / string.Split() / string.Replace() とほぼ同じ発想。

// 前後の空白・改行を取り除いた文字列を返す
// (C#: text.Trim() に相当)
export function cleanWhitespace(text: string): string {
  // TODO: 文字列の前後にある空白・改行を取り除く
  throw new Error("TODO: 未実装");
}

// カンマ区切りの文字列("文芸, 海外文学, 新刊")を、各要素の前後空白も除いた配列にする
// (C#: text.Split(',').Select(s => s.Trim()) に相当)
export function splitTags(text: string): string[] {
  // TODO: カンマで分割し、各要素の前後の空白も取り除く
  throw new Error("TODO: 未実装");
}

// "営業時間: 10:00-20:00" のような "ラベル: 値" 形式の文字列から値の部分だけ取り出す
// (C#: text.Split(':', 2)[1].Trim() に相当。ただし JS の split の第2引数は C# と違い
//  「残りを切り捨てる」ので、値にコロンが含まれるケースは別の組み立て方が要る)
export function extractValue(text: string): string {
  // TODO: 最初のコロンで区切り、値側の前後空白を取り除いて返す
  throw new Error("TODO: 未実装");
}

// name と job から "名前: xxx / 職業: yyy" という形式の1行サマリーを作る
// (C#: $"名前: {name} / 職業: {job}" に相当するテンプレートリテラル)
export function formatSummary(name: string, job: string): string {
  // TODO: テンプレートリテラルを使って指定フォーマットの文字列を組み立てる
  throw new Error("TODO: 未実装");
}
