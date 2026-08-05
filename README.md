# coding_study

Codex をチューターとして進める、個人向けのコーディング学習リポジトリです。

## 構成

- `courses/` — コース別の教材、演習、テスト、ヒント
- `notes/` — 学習セッションごとのノート
- `progress/` — コース別の進捗とスキルマップ
- `.agents/` / `.claude/` / `.codex/` — AI チューター向けの設定やスクリプト

## 学習の進め方

各ユニットは、次の3段階で進めます。

1. `README.md` で学習内容とゴールを確認する
2. `lesson.ipynb` で解説と例題に取り組む
3. `exNN_*.py` を実装し、`tests/` のテストを通す

学習後は `notes/` に振り返りを残し、`progress/` に進捗を記録します。

## テスト実行例

```powershell
python -m pytest courses/<course>/<unit>/tests/test_exNN.py -q
```

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
