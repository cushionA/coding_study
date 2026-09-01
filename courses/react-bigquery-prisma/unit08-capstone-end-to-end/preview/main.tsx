/* =====================================================================
 * プレビューの入口(unit07 と同じ3行)
 * ---------------------------------------------------------------------
 * StrictMode は開発時の抜き打ち検査モード。effect がわざと2回実行されます。
 * 「デバウンスの cleanup が正しければ、2回実行されても結果は変わらない」ことを
 * ブラウザの Network タブで確認してみてください。
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
