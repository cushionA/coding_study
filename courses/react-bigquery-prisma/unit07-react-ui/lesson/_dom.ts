/* =====================================================================
 * このユニット専用の下ごしらえ(読むだけでOK・書き換え不要)
 * ---------------------------------------------------------------------
 * React は「DOM(ブラウザが持っている画面のツリー)」に描き込むライブラリです。
 * ところが Node には DOM がありません(document も window も存在しない)。
 * そこで jsdom という「Node の中に偽物のブラウザ環境を1個作る」ライブラリで
 * document / window を用意し、グローバルに置きます。
 *
 * C# で言えば、WPF の UI を単体テストするために STA スレッドと Dispatcher を
 * テスト用に立ち上げてから Window を new する、あの下ごしらえに相当します。
 *
 * ★ これは「Node で React を動かすための実験装置」であって、実務のアプリコードに
 *   こんなものは書きません。ブラウザには本物の document が最初からあるからです。
 *   演習(tests/)では vitest が同じことを自動でやってくれます
 *   (テストファイルの先頭に「@vitest-environment jsdom」と書いた docblock を
 *    1行置くだけで、そのファイルだけ jsdom 環境に切り替わります)。
 * ===================================================================== */

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true, // requestAnimationFrame などを用意させる
});

const g = globalThis as unknown as Record<string, unknown>;

// document / window をグローバルに置く。React はこの2つを名前で探しにくる。
g.window = dom.window;
g.document = dom.window.document;

// HTMLElement / Element / Event / MutationObserver ... など、ブラウザにある
// グローバルをまとめて移植する(既にある名前は上書きしない)。
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (key in g) continue;
  const desc = Object.getOwnPropertyDescriptor(dom.window, key);
  if (desc) {
    try {
      Object.defineProperty(g, key, desc);
    } catch {
      /* 移植できないものは黙って諦める */
    }
  }
}

// navigator は Node 22 に読み取り専用で既に居るので、定義し直して差し替える。
try {
  Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });
} catch {
  /* 差し替え不可でも致命的ではない */
}

// React に「今はテスト実行中(=状態更新をまとめて処理してよい)」と伝える目印。
// これが無いと「An update to X inside a test was not wrapped in act(...)」という
// 警告が大量に出ます。
g.IS_REACT_ACT_ENVIRONMENT = true;

export {};
