// ex01_string_extract: 文字列操作の基本(trim/split/replace/テンプレートリテラル)
// スクレイピングで拾った生のHTML文字列は前後に空白や改行が混じっていることが多い。
// cheerioを使う前に、まずはTypeScript標準の文字列メソッドで素朴な処理に慣れる。
// C#の string.Trim() / string.Split() / string.Replace() とほぼ同じ発想。

// 前後の空白・改行を取り除いた文字列を返す
// (C#: text.Trim() に相当)
export function cleanWhitespace(text: string): string {
  return text.trim();
}

// カンマ区切りの文字列("文芸, 海外文学, 新刊")を、各要素の前後空白も除いた配列にする
// (C#: text.Split(',').Select(s => s.Trim()) に相当)
export function splitTags(text: string): string[] {
  return text.split(",").map((part) => part.trim());
}

// "営業時間: 10:00-20:00" のような "ラベル: 値" 形式の文字列から値の部分だけ取り出す
// (C#: text.Split(':', 2)[1].Trim() に相当。値の中にコロンが含まれる可能性は考えなくてよい)
export function extractValue(text: string): string {
  const [, ...rest] = text.split(":");
  return rest.join(":").trim();
}

// name と job から "名前: xxx / 職業: yyy" という形式の1行サマリーを作る
// (C#: $"名前: {name} / 職業: {job}" に相当するテンプレートリテラル)
export function formatSummary(name: string, job: string): string {
  return `名前: ${name} / 職業: ${job}`;
}
