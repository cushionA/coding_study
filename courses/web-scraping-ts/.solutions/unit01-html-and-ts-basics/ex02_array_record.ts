// ex02_array_record: 配列メソッドとRecord<K, V>操作
// スクレイピングでは「タグの集合からURLだけ集める」「出現回数を数える」といった
// 配列/オブジェクト操作が頻出する。C#のLINQ(Select/Where)とDictionary<K,V>に相当する
// TypeScriptの書き方(map/filter・Record<K, V>)にここで慣れておく。

// 文字列の配列から、5文字以上のものだけを大文字にして返す
// (C#: words.Where(w => w.Length >= 5).Select(w => w.ToUpper()).ToList() に相当)
export function longWordsUpper(words: string[]): string[] {
  return words.filter((w) => w.length >= 5).map((w) => w.toUpperCase());
}

// タグ名の配列から、各タグの出現回数を数えたRecord<string, number>を返す
// 例: ["新刊", "文芸", "新刊"] -> {"新刊": 2, "文芸": 1}
// (C#: words.GroupBy(w => w).ToDictionary(g => g.Key, g => g.Count()) に相当)
export function countTags(tags: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tag of tags) {
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return counts;
}

// {タグ名: 出現回数} のRecordから、出現回数がmost番目に多いタグ名を1つ返す
// most=1なら最多、most=2なら2番目に多いタグ、という意味
// 同数の場合はタグ名の昇順で順位を決める
export function mostCommonTag(counts: Record<string, number>, most = 1): string {
  const ordered = Object.entries(counts).sort(([keyA, countA], [keyB, countB]) => {
    if (countA !== countB) return countB - countA;
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  });
  return ordered[most - 1][0];
}

// {タグ名: 出現回数} のRecordから、出現回数が1回だけ(ユニーク)のタグ名の配列を
// タグ名の昇順で返す
export function uniqueTags(counts: Record<string, number>): string[] {
  return Object.entries(counts)
    .filter(([, count]) => count === 1)
    .map(([tag]) => tag)
    .sort();
}
