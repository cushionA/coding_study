/* =====================================================================
 * jsdom の最小型宣言(読むだけでOK・書き換え不要)
 * ---------------------------------------------------------------------
 * jsdom は JavaScript で書かれたライブラリで、型定義が同梱されていません
 * (別パッケージ @types/jsdom を入れる必要がある)。このコースはオフラインで
 * 完結させるため、_dom.ts で使う分だけをここで宣言しておきます。
 *
 * C# で言えば「型情報のない COM/ネイティブDLL に対して、自分で
 * extern 宣言や相互運用ラッパーを書く」のに相当します。
 * TypeScript ではこの「.d.ts に declare module で外部モジュールの形を教える」
 * というやり方が標準的な逃げ道です。
 * ===================================================================== */

declare module "jsdom" {
  export class JSDOM {
    constructor(
      html?: string,
      options?: { url?: string; pretendToBeVisual?: boolean },
    );
    readonly window: Window & typeof globalThis;
  }
}
