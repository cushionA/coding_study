import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// テストごとにDOMをアンマウントする。vitest.config.tsでtest.globalsを有効に
// していない(describe/it/expectを各テストファイルで明示import する方針)ため、
// @testing-library/reactの自動クリーンアップ検出が働かない。ここで明示的に
// 登録しないと、同じテストファイル内の複数testでrender()した要素が
// document上に積み重なってしまう(例: <li>の件数が期待値の2倍になる、
// 前のtestの<p>読み込み中...</p>が消えずに残る、など)。
afterEach(() => {
  cleanup();
});
