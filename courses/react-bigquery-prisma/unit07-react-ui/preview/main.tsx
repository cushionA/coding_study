/* =====================================================================
 * プレビューの入口(エントリポイント)
 * ---------------------------------------------------------------------
 * React アプリの起動は、この3行がすべてです:
 *   ① HTML の中の「React に任せる場所」を1つ選ぶ(#root)
 *   ② createRoot でそこに React のルートを作る
 *   ③ render に、いちばん外側のコンポーネントを渡す
 *
 * C# で言えば Program.cs の Main + Application.Run(new MainWindow()) に
 * 相当します。以降の画面はすべてコンポーネントの入れ子で表現されます。
 *
 * <StrictMode> は開発時の抜き打ち検査モードです(概念4)。
 * 開発サーバでは effect がわざと2回実行されます。ブラウザの開発者ツールの
 * コンソールを開いて、ログが2回出ることを確かめてみてください。
 * 本番ビルドでは1回だけになります。
 * ===================================================================== */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const container = document.getElementById("root");
if (container === null) throw new Error("#root が index.html に見つかりません");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
