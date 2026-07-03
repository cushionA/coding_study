# TypeScript コース規約(lesson=実行スクリプト / grading=vitest)

Python コースの構造(README=地図 / lesson=一緒にやる / 演習=一人でやる、`lesson.ipynb.md` の「なぜ→解説→見る→予測→変える→書く→チェック」)を TypeScript 媒体に翻訳したもの。course.json の `format` は `{"lesson": "script", "grading": "vitest"}`。

## コースのプロジェクト構成

```
courses/<course>/
  package.json        (dependencies: cheerio 等 / devDependencies: typescript, tsx, vitest, @types/node)
  tsconfig.json       (strict: true, module/target: ESNext, moduleResolution: bundler)
  vitest.config.ts    (test.include: ["unit*/tests/**/*.test.ts"])
  data/               (フィクスチャ)
  unitNN-<topic>/
    README.md
    lesson/NN_<concept>.ts   (概念ごとに1ファイル、下記形式)
    exNN_<name>.ts           (スケルトン)
    tests/exNN.test.ts
    hints/exNN.md
  .solutions/unitNN-<topic>/exNN_<name>.ts
```

- `npm install` はコースディレクトリ直下で1回。`node_modules/` は .gitignore 済み。
- 実行はすべてコースディレクトリを cwd にする: `npx tsx unit01-.../lesson/01_foo.ts` / `npx vitest run unit01-.../tests`。

## テストの解答切替(conftest 相当・固定仕様)

各テストファイルの冒頭で**2つのリテラルパスの条件 import** を使う(vite が両方を静的解析できる形。変数パスの動的 import は使わない):

```ts
import { describe, it, expect } from "vitest";

const ex = process.env.USE_SOLUTIONS === "1"
  ? await import("../../.solutions/unit01-<topic>/ex01_<name>")
  : await import("../ex01_<name>");
```

検証コマンド(コースディレクトリで):
- スケルトン: `npx vitest run unitNN-<topic>/tests` → 全FAIL(NotImplementedError 相当の `throw new Error("TODO")` 由来)
- 解答: PowerShell `$env:USE_SOLUTIONS="1"; npx vitest run unitNN-<topic>/tests; Remove-Item Env:USE_SOLUTIONS` → 全PASS

## スケルトン規約(exercise.py.md の翻訳)

- 提供コード約70%。空欄は `// TODO: <何を埋めるか(tier1相当のみ)>` + `throw new Error("TODO: 未実装");`
- **TODO に API 完全形・確定引数・コピペで通る式を書かない**(hints の tier2/3 の領分)。
- 必ず import 可能(トップレベルで throw しない)。`export function` で公開。
- C#アナロジーをコメントで積極活用(TS は C# に近い: 型注釈・ジェネリクス・async/await・アロー関数=ラムダ)。
- データ読込は `import { fileURLToPath } from "node:url"` + `path.dirname` 基準で解決し、`.solutions` 配下でも壊れないよう「自ファイルが .solutions 内かを判定してから data/ を解決」するパターンを使う。

## lesson スクリプト形式(lesson.ipynb.md の翻訳)

概念ごとに `lesson/NN_<concept>.ts` を1本(1ユニット3〜4本)。学習者は VS Code でファイルを開き、読みながら `npx tsx` で実行→「書いてみる」ブロックを編集→再実行、で進む。

```ts
/* =====================================================================
 * 概念N: <タイトル>
 * ---------------------------------------------------------------------
 * ■ なぜ: <実務のどこで使うか 2〜4文>
 * ■ 解説: <概念説明。C#アナロジー。API名には「何をするものか」を添える>
 * ===================================================================== */
// check ヘルパー(全 lesson ファイル共通・先頭に配置)
function check(name: string, actual: unknown, expected: unknown, hint = ""): boolean {
  const ok = actual !== null && actual !== undefined
    && JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) console.log(`[OK] ${name}: 正解!`);
  else {
    console.log(`[NG] ${name}: 期待値 ${JSON.stringify(expected)} / 実際 ${JSON.stringify(actual)}`);
    if (hint) console.log(`     ヒント: ${hint}`);
  }
  return ok;
}

// --- 見る(worked example) ---------------------------------------------
// GOAL: このブロックで分かること(1行)
// STEP 1: <ステップ名> — 何をしているか
...実行可能なコード + console.log で中間状態を見せる...

// --- 予測してみよう -----------------------------------------------------
// 次のブロックを実行する前に、結果を予測: <質問>(答えはコメントに書かない)
...パラメータを変えたコード...

// --- 書いてみる ---------------------------------------------------------
// 課題: <③⑤より一歩だけ新しい要素を含む小さな課題>
// ヒント(概念レベル1行のみ)
let result1: <型> | null = null;
// ここに書く(result1 に代入する)

check("概念N", result1, <期待値リテラル>, "<自力で直せるヒント>");
```

- チェックの期待値は**リテラル**(解答ロジックをcheck呼び出しに書かない)。
- 未記入(null)でも**例外で落ちず** [NG]+ヒントが出ること。ファイル全体が素の状態で exit 0 であること。
- 最後の lesson ファイル末尾に振り返りコメントブロック(自分の言葉で/難しかったこと)とまとめ+先読みを書く。

## 生成後の検証(必須)

1. 各 lesson ファイル: 素で `npx tsx <file>` → exit 0・全チェック [NG]。「ここに書く」に解答を仮置き → 全 [OK](検証後、必ず未記入状態に戻す)。
2. `python .claude/scripts/check_unit.py courses/<course> <unit>` → ok: true(vitest 両方向+lesson素実行を自動検証)。
