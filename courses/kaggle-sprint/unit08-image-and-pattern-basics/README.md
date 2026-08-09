# unit08: 画像とパターン認識の基礎

このユニットを終えると、画像をHWC/CHWの数値配列として扱い、前処理・近傍重複検出・古典特徴・group分割を実装できる。

## なぜ学ぶか

画像分類の不具合は、モデルより前にshape、チャネル順、dtype、値域の食い違いで起きることが多い。また同じ商品の微修正版がtrain/validへ跨ぐとunit02と同じ重複リークになる。画像を配列として検算し、不変性を特徴や拡張へ落とす力は深層学習でもそのまま必要になる。

HWC↔CHWはC#の多次元配列の軸を並べ替える操作で、既習のNumPy broadcastingがそのまま使える。

## 課題


| 課題 | 内容 | 目安 |
|---|---|---|
| ex01_image_array_ops | shape・dtype・軸・グレースケール | 15分 |
| ex02_resize_and_normalize | アスペクト比・crop・チャネル標準化 | 20分 |
| ex03_perceptual_hash_dedup | aHash・dHashとハミング距離 | 15分 |
| ex04_capstone | augmentation・古典特徴・group-aware OOF | 20分 |

## マイルストーン

- [ ] 変換ごとにshape・dtype・値域を確認できる
- [ ] train統計でチャネル標準化できる
- [ ] 少し違う同一画像を知覚ハッシュで探せる
- [ ] product単位でリークのないOOFと誤分類一覧を作れる
