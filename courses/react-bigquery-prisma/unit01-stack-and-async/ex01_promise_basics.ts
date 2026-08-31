// ex01_promise_basics: Promise と async/await の基本操作
// C#で言えば Promise<T> は Task<T> にほぼ対応する。「まだ終わっていない処理の
// 未来の結果」を表すオブジェクトで、await(C#と同一キーワード!)を付けて初めて
// 中身の値を取り出せる。await を付け忘れると、値の代わりに Promise オブジェクト
// そのものが流れてしまう典型バグがあるので、意識しながら埋めていくこと。

// 指定ミリ秒だけ待ってから resolve する Promise<void> を返す。
// C#で言えば Task.Delay(ms) に相当する、非同期処理の一番小さい部品。
export function wait(ms: number): Promise<void> {
  // TODO: 新しい Promise を作り、setTimeout の中で resolve() を呼んで完了させる
  // ヒント: `new Promise<void>((resolve) => { ... })` の形
  throw new Error("TODO: 未実装");
}

// n を受け取り、ms ミリ秒待ってから n*2 を返す非同期関数。
// C#の async Task<int> Method() と同じ発想: 関数全体を async にし、
// 内部で await した結果を使って値を組み立てて return する。
export async function doubleAfterDelay(n: number, ms: number): Promise<number> {
  // TODO: wait(ms) を await してから n*2 を返す
  throw new Error("TODO: 未実装");
}

// Promise を返す関数(タスク)の配列を「1件ずつ順番に」実行し、結果を配列で返す。
// C#の foreach + await task ずつの逐次実行に相当する。
// 前のタスクの Promise が解決するまで、次のタスクの呼び出し自体が始まらない点に注意。
// <T> はC#のジェネリクスと同じ発想: number専用ではなく、どんな型のタスクでも使える。
export async function runInSeries<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
  // TODO: 空配列を用意し、for...of で tasks を1件ずつ呼び出して await し、
  // 結果を配列に積んでいく(Promise.all は使わないこと)
  throw new Error("TODO: 未実装");
}

// Promise を返す関数(タスク)の配列を「全部同時に」実行し、結果を配列で返す。
// C#の Task.WhenAll に相当する。入力の並び順どおりに結果が返る点は
// runInSeries と同じだが、全タスクが最初からいっせいに走り出す点が違う。
export async function runInParallel<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
  // TODO: tasks を呼び出して Promise の配列を作り、Promise.all で一括 await する
  throw new Error("TODO: 未実装");
}
