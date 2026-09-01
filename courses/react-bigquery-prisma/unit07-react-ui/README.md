# unit07: Reactで一覧画面を作る

このユニットを終えると、propsで受け取った値を表示し、ユーザー操作に応じて
状態を変え、配列を一覧描画し、APIから取得したデータをローディング/エラー/空/
成功の4状態で出し分ける——という、実務の一覧画面に必要な部品を一通り
自分で書けるようになる。unit06までに作ったバックエンドAPIに、ここで初めて
「顔」が付く。

## なぜ学ぶか

unit06までで「データを取得・保存・提供するサーバ」は完成した。しかし
実際にユーザーが触るのはブラウザの画面。どんなに立派なAPIがあっても、
それを表示するUIがなければ誰も使えない。Reactは「状態(state)が変わったら
画面を自動で描き直す」という発想でこの問題を解く、業界標準のUIライブラリ。

## 概念: 命令的UIと宣言的UI

- C#のWinForms/WPFで検索ボタンを押したときの典型的な書き方は
  `button.Click += (s, e) => { label.Text = "貸出中"; };` のように、
  **コントロールを直接掴んで書き換える**(命令的UI)。
- Reactは逆で、「今の状態(state)」を書き換えると、Reactが前の画面と
  次の画面の差分を計算して勝手に描き直す(宣言的UI)。開発者は
  「今の状態から何を表示すべきか」をJSXという式の中に書くだけでよく、
  DOM操作そのものは書かない。
- props は関数の引数(C#で言えばコンストラクタ引数+readonlyプロパティ)、
  state はコンポーネント自身が持つ「書き換え可能だが直接は書き換えない」
  値で、`useState`という特別な関数(フック)で作る。

```tsx
function BookCard({ title, author }: { title: string; author: string }) {
  return (
    <div>
      <h3>{title}</h3>
      <p>著者: {author}</p>
    </div>
  );
}
```

## 進め方

lesson(Viteの開発サーバでブラウザに実際の画面を表示しながら進める)で
概念を一通り触ったあと、`ex01_props_component.tsx`から順に開き、TODOを埋めて

```
npx vitest run unit07-react-ui/tests/ex01.test.tsx
```

(cwdは`courses/react-bigquery-prisma/`)が通れば次へ。詰まったら
`hints/exNN.md`をtier1から順に読む。テストは`@testing-library/react`の
`render`/`screen`/`fireEvent`で、実際にコンポーネントを描画してDOMを
検証する(見た目のスクリーンショットではなく、テキストや要素の有無で判定する)。

## 課題

| 課題 | 内容 | 目安 |
|------|------|------|
| ex01_props_component | propsを受け取り表示するだけの関数コンポーネント | 10分 |
| ex02_state_events | useState+onClickでボタン操作に応じて表示を変える | 15分 |
| ex03_list_render | 配列をmapで一覧描画し、keyにidを使う理由を理解する | 10分 |
| ex04_capstone | useEffectでAPI取得し、4状態(読込中/エラー/空/成功)を出し分ける | 20分 |

外部通信はしない。ex04のAPI取得はfake fetch関数(`fetchBooks`)を
propsで注入する形でテストする。

## マイルストーン(全部チェックできたらユニット完了)

- [ ] propsで受け取った値を表示する関数コンポーネントを、型付きで自分で書ける
- [ ] useStateとイベントハンドラで、ユーザー操作に応じて画面が変わる
      コンポーネントを書ける
- [ ] 配列をmapで一覧描画し、keyに何を渡すべきか(なぜindexではだめか)を
      説明できる
- [ ] useEffectでAPIからデータを取得し、ローディング/エラー/空/成功の
      4状態を出し分けられる
- [ ] 命令的UIと宣言的UIの違いを、C#のUIフレームワークと対比して説明できる
