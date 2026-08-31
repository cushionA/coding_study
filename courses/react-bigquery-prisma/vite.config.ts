import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React ユニットの lesson プレビュー用。各ユニットの preview/ ディレクトリを
// `npx vite <unit-dir>/preview` のように root 引数で指定して起動する。
export default defineConfig({
  plugins: [react()],
});
