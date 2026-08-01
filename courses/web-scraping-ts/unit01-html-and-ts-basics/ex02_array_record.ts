// ex02_array_record: 配列メソッドとRecord<K, V>操作
// スクレイピングでは「タグの集合からURLだけ集める」「出現回数を数える」といった
// 配列/オブジェクト操作が頻出する。C#のLINQ(Select/Where)とDictionary<K,V>に相当する
// TypeScriptの書き方(map/filter・Record<K, V>)にここで慣れておく。

// 文字列の配列から、5文字以上のものだけを大文字にして返す
// (C#: words.Where(w => w.Length >= 5).Select(w => w.ToUpper()).ToList() に相当)
export function longWordsUpper(words: string[]): string[] {
  // TODO: filterで「5文字以上」だけ絞り込み、mapで大文字化する
  return words.filter(x => x.length >= 5).map(x => x.toUpperCase());
}

// タグ名の配列から、各タグの出現回数を数えたRecord<string, number>を返す
// 例: ["新刊", "文芸", "新刊"] -> {"新刊": 2, "文芸": 1}
// (C#: words.GroupBy(w => w).ToDictionary(g => g.Key, g => g.Count()) に相当)
export function countTags(tags: string[]): Record<string, number> {
  // TODO: Record<string, number>を使ってタグごとの出現回数を数える(forループでもreduceでもよい)
  let result:Record<string, number> = {};
  for(const tag of tags){
    result[tag] = (result[tag] ?? 0) + 1;
  }
  return result;
}

// {タグ名: 出現回数} のRecordから、出現回数がmost番目に多いタグ名を1つ返す
// most=1なら最多、most=2なら2番目に多いタグ、という意味
// 同数の場合はタグ名の昇順で順位を決める
export function mostCommonTag(counts: Record<string, number>, most = 1): string {
  // TODO: Object.entriesの項目を出現回数の降順(同数はタグ名昇順)に並べ、most番目を取り出す
  const sorted = Object.entries(counts).sort(([tagA, countA], [tagB, countB]) => {
  const countDifference = countB - countA;

  if (countDifference !== 0) {
    return countDifference;
  }

  return tagA < tagB ? -1 : tagA > tagB ? 1 : 0;
});
  return sorted[most-1][0];
}

// {タグ名: 出現回数} のRecordから、出現回数が1回だけ(ユニーク)のタグ名の配列を
// タグ名の昇順で返す
export function uniqueTags(counts: Record<string, number>): string[] {
  // TODO: Object.entriesを走査して出現回数が1の項目だけ抽出し、キーを昇順に並べる
  return Object.entries(counts).filter(x=> x[1]===1).map(x=> x[0]).sort();
}
