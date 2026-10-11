# intake-inspector

**Spot the silent anomalies in your CSV — before they break your matching.**

CSVを読むだけで、「いつもと違う形の値」を見つける検査ツールです。

**公開 URL：** https://hyde-the-surveyor.github.io/intake-inspector/

ブラウザの中だけで動きます。読み込んだファイルはブラウザの外に送信されません。

## なぜ作ったか

製造業の基幹システムから自動で取り込んでいたデータで、外部システムの採番ルールが予告なく変わり、
IDの先頭に拠点コードが付くようになりました。

取込処理はエラーを出さずに成功し続けました。しかし分類ロジックが桁数で判定していたため、
進行中の受注が**静かに紐づかなくなって**いました。

エラーが出ない壊れ方は、人が見に行かない限り見つかりません。
intake-inspector は、列ごとに値の長さ・文字の種類・先頭の並びを集計し、
**多数派から外れた値**を光らせます。

同梱のサンプルデータは、この事象を架空のデータで再現したものです。

## 特徴

- **値を変えない。** すべて文字列として読み、先頭の0も全角も空白もそのまま表示します
- **Shift_JIS に対応。** 文字コードは自動で判定します
- **データを送らない。** ブラウザの中だけで動きます。サーバーはありません

## 使い方

1. CSVファイルをドロップする（または「サンプルを読み込む」を押す）
2. 列の一覧で、注意の付いた列を開く
3. 長さの分布と、長さ別の先頭3文字を確認する

## ローカルで動かす

Node.js 20 以上と npm が必要です。

```sh
npm install
npm run dev     # http://localhost:5173/intake-inspector/ で開く
npm test        # 判定ロジックのテスト（Vitest）
npm run build   # dist/ に本番ビルドを出力
```

## ライセンス

MIT License。詳細は [LICENSE](LICENSE) を参照してください。

## Author

Hyde the Surveyor
