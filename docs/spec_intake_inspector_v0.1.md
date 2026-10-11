# 実装スペック：intake-inspector v0.1

*2026-09-26 作成／Hyde the Surveyor*
*リポジトリ：`Hyde-the-Surveyor/intake-inspector`（public）*

---

## 0. このツールについて

**CSVを読むだけで、「いつもと違う形の値」を光らせる検査ツール。**

取込処理は、エラーを出さずに静かに壊れることがある。
値の形式が変わっても、取込自体は成功し続けるからだ。
intake-inspector は、列ごとに値の「長さ」「文字の種類」「先頭の並び」を集計し、
**多数派から外れた値**を人の目に見える形で示す。

- **読むだけ。** データを直さない、保存しない、どこにも送らない
- **ブラウザだけで動く。** サーバーなし。GitHub Pages で公開する

---

## 1. 目的とスコープ

### v0.1 でやること

1ファイルのCSVを読み込み、**列ごとの診断結果（プロファイル）**を表示する。

診断項目は4つ。

| # | 項目 | 見つけたいもの |
|---|---|---|
| 1 | **長さの分布** | 桁数が変わった値、混入した値 |
| 2 | **文字の種類** | 全角数字、英字の混入、記号の混在 |
| 3 | **欠損・空白** | 空欄、前後の空白、空白だけの値 |
| 4 | **先頭の並び** | 接頭辞の付与、コード体系の変化 |

### v0.1 の完成の定義

サンプルCSVを読み込んだとき、**製造指示IDの列で「少数派の長さ」の警告が出て、
その長さ（10文字）のグループの先頭3文字に「200」が最上位で表示される**こと。

---

## 2. 設計上の決定事項

| 項目 | 決定 | 理由 |
|---|---|---|
| 実行環境 | **ブラウザのみ**（サーバーなし） | 公開が容易。データが外に出ない |
| 値の扱い | **すべて文字列として読む。1文字も変えない** | `00071048` を数値化すると先頭の0が消える。検査ツールが値を変えてはならない |
| 文字コード | **自動判定＋手動切替**（UTF-8 / Shift_JIS） | 製造業の基幹系が出力するCSVは Shift_JIS が多い |
| 長さの数え方 | **Unicode のコードポイント数**（`[...value].length`） | サロゲートペアで長さがずれないように |
| 長さの対象 | **加工前の値**（trim しない） | 末尾の空白で長さが変わること自体が検出対象 |
| 保存 | **しない**（localStorage 等も使わない） | 業務データを端末に残さない |
| 通信 | **しない** | 同上 |

---

## 3. 技術構成

| 項目 | 採用 |
|---|---|
| ビルド | Vite |
| UI | React 18 以上 |
| 言語 | **TypeScript**（`strict: true`） |
| CSV パース | PapaParse |
| テスト | Vitest |
| スタイル | プレーンな CSS（UIフレームワーク・グラフライブラリは入れない） |
| 公開 | GitHub Pages（GitHub Actions でデプロイ） |
| Node | 20 以上 / npm |
| ライセンス | MIT |

---

## 4. ディレクトリ構成

```
intake-inspector/
├─ src/
│  ├─ lib/                 ← 判定ロジック（UIに依存しない純粋な関数だけ）
│  │  ├─ decode.ts         ← ArrayBuffer → 文字列（文字コード判定）
│  │  ├─ parse.ts          ← 文字列 → string[][]（PapaParse のラッパー）
│  │  ├─ classify.ts       ← 1つの値の文字種を判定
│  │  ├─ profile.ts        ← string[][] → ColumnProfile[]
│  │  ├─ rules.ts          ← 警告ルールと閾値の定数
│  │  └─ types.ts
│  ├─ components/
│  │  ├─ FileInput.tsx     ← ファイル選択・ドラッグ&ドロップ・文字コード切替
│  │  ├─ Summary.tsx       ← ファイル全体の概要
│  │  ├─ Overview.tsx      ← 列の一覧（1列1行）
│  │  ├─ ColumnDetail.tsx  ← 選んだ列の詳細
│  │  └─ DistTable.tsx     ← 分布表（棒つき）
│  ├─ App.tsx
│  ├─ App.css
│  └─ main.tsx
├─ public/
│  └─ sample/
│     └─ sample_seizo_shiji.csv   ← 同梱のサンプル（Shift_JIS）
├─ tests/                  ← lib/ のテスト
├─ .github/workflows/deploy.yml
└─ README.md
```

**`lib/` は React を import しないこと。** 判定ロジックを画面から切り離し、単体でテストできる状態を保つ。

---

## 5. 処理の流れ

```
File（ArrayBuffer）
  └─ decode()   … 文字コードを判定して文字列に
       └─ parse()   … CSV を string[][] に
            └─ profile()   … 列ごとに集計し、警告を判定
                 └─ 画面に表示
```

---

## 6. 仕様詳細

### 6-1. 文字コード（`decode.ts`）

```ts
type EncodingChoice = 'auto' | 'utf-8' | 'shift_jis';

function decode(buf: ArrayBuffer, choice: EncodingChoice):
  { text: string; detected: 'utf-8' | 'shift_jis' };
```

- `auto` の場合：
  1. `new TextDecoder('utf-8', { fatal: true })` で試す
  2. 例外が出たら `new TextDecoder('shift_jis')` で読む
- 先頭の BOM（U+FEFF）は取り除く
- 画面に「検出した文字コード」を表示し、ユーザーが手動で切り替えられるようにする

### 6-2. CSV 読込（`parse.ts`）

- PapaParse の設定：`{ header: false, dynamicTyping: false, skipEmptyLines: 'greedy' }`
- **`dynamicTyping` は必ず `false`。** 値を数値や真偽値に変換させない
- 「1行目は見出し」チェック（初期値 ON）
  - ON：1行目を列名にする
  - OFF：列名は `列1`, `列2`, …
- 行ごとに列数が違う場合：
  - 列数は全行の最大値とする
  - 足りないセルは `""`（空欄）として扱う
  - 列数が見出しと一致しない行の数を、サマリーに表示する（警告ルールには含めない）

### 6-3. 文字種の分類（`classify.ts`）

1つの値に1つの分類を付ける。**上から順に判定し、最初に当てはまったもの**を採用する。

| 分類 | 条件 | 例 |
|---|---|---|
| `empty` | `""` | |
| `digits` | `/^[0-9]+$/` | `7104800` |
| `alnum` | `/^[0-9A-Za-z]+$/` | `ZZ84572033` |
| `ascii` | `/^[\x20-\x7E]+$/` | `00133-B`, `TST-61Y4` |
| `fullwidth_digit` | 全角数字 `/[０-９]/` を含む | `１２０` |
| `non_ascii` | 上記以外 | `ブッシュ`, `ガイドφ12` |

画面上の表示名：

| 分類 | 表示名 |
|---|---|
| `digits` | 半角数字 |
| `alnum` | 半角英数 |
| `ascii` | 半角（記号・空白を含む） |
| `fullwidth_digit` | 全角数字を含む |
| `non_ascii` | 全角・その他 |

### 6-4. 列プロファイル（`profile.ts` / `types.ts`）

```ts
type CharClass = 'empty' | 'digits' | 'alnum' | 'ascii' | 'fullwidth_digit' | 'non_ascii';
type Level = 'info' | 'warn';

type WarningCode =
  | 'MISSING' | 'WHITESPACE' | 'LEN_MIXED' | 'LEN_MINORITY'
  | 'CLASS_MIXED' | 'FULLWIDTH_DIGIT' | 'LEADING_ZERO';

interface Warning {
  code: WarningCode;
  level: Level;
  message: string;        // 画面にそのまま出す日本語（6-6 参照）
}

interface ColumnProfile {
  index: number;
  name: string;
  total: number;          // データ行数（見出しを除く）
  empty: number;          // value === ""
  whitespaceOnly: number; // value !== "" かつ value.trim() === ""
  trimIssues: number;     // value !== "" かつ value !== value.trim()
  leadingZero: number;    // /^0[0-9]/ に一致
  distinct: number;       // 空欄を除いた値の種類数
  lengthDist: { length: number; count: number }[];               // 空欄を除く。長さ昇順
  classDist: { cls: CharClass; count: number }[];                // 空欄を除く。件数降順
  prefixByLength: {                                              // 長さグループごとの先頭3文字
    length: number;
    prefixes: { prefix: string; count: number }[];               // 上位5件。件数降順
    others: number;                                              // 上位5件以外の件数
  }[];
  samples: string[];      // 空欄以外の値から先頭5件
  warnings: Warning[];
}
```

- 先頭の文字数は **3文字で固定**（v0.1）
- `String.prototype.trim()` は全角スペース（U+3000）も取り除く。前後の全角スペースも検出対象に含まれる

### 6-5. 警告ルール（`rules.ts`）

閾値は `rules.ts` に**名前付きの定数**として置く。

```ts
export const LEN_MINORITY_SHARE = 0.05;  // 構成比 5% 未満の長さを「少数派」とみなす
export const LEN_DOMINANT_SHARE = 0.50;  // 最多の長さが 50% 以上を占める列だけを対象にする
export const LEN_MAX_GROUPS    = 5;      // 長さが 5 種類以下の列だけを対象にする
```

| コード | レベル | 条件 |
|---|---|---|
| `MISSING` | info | `empty > 0` |
| `WHITESPACE` | **warn** | `trimIssues > 0` または `whitespaceOnly > 0` |
| `LEN_MIXED` | info | 長さの種類が 2 以上 |
| `LEN_MINORITY` | **warn** | 下記の3条件をすべて満たす |
| `CLASS_MIXED` | info | 文字種（`empty` を除く）の種類が 2 以上 |
| `FULLWIDTH_DIGIT` | **warn** | `fullwidth_digit` の件数 > 0 |
| `LEADING_ZERO` | info | `leadingZero > 0` |

#### `LEN_MINORITY` の条件

1. 長さの種類が **2 以上 `LEN_MAX_GROUPS` 以下**
2. 最多の長さの構成比が **`LEN_DOMINANT_SHARE` 以上**
3. 構成比が **`LEN_MINORITY_SHARE` 未満**の長さグループが存在する

**なぜこの3条件か：**
コード類（IDや番号）の列は、長さが数種類に限られ、特定の長さが大多数を占める。
品名のような自由記述の列は長さがばらばらなので、1と2で対象から外れる。
数量のように長さが均等に散らばる列も、2で外れる。
**「本来そろっているはずの列に、形の違う値が少しだけ混ざっている」状態だけを拾う。**

構成比の分母は、空欄を除いた件数とする。

### 6-6. 警告の表示文言

| コード | 見出し | 説明文 |
|---|---|---|
| `MISSING` | 欠損があります | 空欄の値が {n} 件（{p}%）あります。 |
| `WHITESPACE` | 前後に空白があります | 見た目は同じでも、突合では別の値として扱われます。（{n} 件） |
| `LEN_MIXED` | 長さがそろっていません | {k} 種類の長さが混在しています。 |
| `LEN_MINORITY` | 少数派の長さがあります | ほとんどの値は {L} 文字ですが、{L2} 文字の値が {n} 件だけあります。形式の変更や混入の可能性があります。 |
| `CLASS_MIXED` | 文字の種類がそろっていません | {種類の一覧} が混在しています。 |
| `FULLWIDTH_DIGIT` | 全角数字が含まれています | 数値として扱われず、比較や集計で一致しない原因になります。（{n} 件） |
| `LEADING_ZERO` | 先頭が 0 の値があります | Excel で開くと 0 が消えることがあります。（{n} 件） |

**色だけで区別しないこと。** warn / info はアイコンと文字（「注意」「情報」）でも示す。

---

## 7. 画面

1ページ構成。上から順に：

1. **ヘッダー**
   - `intake-inspector`
   - 一行説明：「CSVを読むだけで、いつもと違う形の値を見つけます」
   - 小さく：「読み込んだファイルはブラウザの外に送信されません」

2. **読み込みエリア**
   - ドラッグ&ドロップ ＋ ファイル選択ボタン
   - 文字コード：`自動` / `UTF-8` / `Shift_JIS`（切り替えたら再判定）
   - チェックボックス：「1行目は見出し」
   - ボタン：「**サンプルを読み込む**」（`public/sample/sample_seizo_shiji.csv` を fetch）

3. **サマリー**
   - ファイル名 / 行数 / 列数 / 検出した文字コード
   - 注意の件数・情報の件数
   - 列数が一致しない行の数（0 件なら表示しない）

4. **列の一覧**（1列1行の表）
   - 列名 / 件数 / 欠損 / 長さの種類 / 文字種の種類 / 警告バッジ
   - **注意がある列を上に並べる**
   - 行をクリックすると、その列の詳細を表示

5. **列の詳細**
   - 警告（見出し＋説明文）
   - **長さの分布**：長さ / 件数 / 構成比 / 横棒。**少数派の行を強調**
   - **文字種の分布**：同上
   - **長さ別の先頭3文字**：長さグループごとに上位5件 ＋「その他 n 件」
   - サンプル値（5件）

6. **フッター**
   - `by Hyde the Surveyor` / GitHub へのリンク

横棒は `<div>` の幅（%）で描く。グラフライブラリは使わない。

---

## 8. サンプルデータ

`public/sample/sample_seizo_shiji.csv`（**同梱済み。このファイルをそのまま使うこと**）

- 400 行 × 6 列、**Shift_JIS**、改行 CRLF
- 会社名・品名・図番はすべて**架空**
- 列：`製造指示ID, 部品名, 図面番号, 数量, 納期, 得意先`

### 仕込んである事象

| 列 | 内容 |
|---|---|
| 製造指示ID | 6桁 60件、7桁 330件、**先頭に「200」が付いた10桁 10件**（ファイル後半に混入） |
| 数量 | 全角数字 2件（`１２０`, `３５`） |
| 得意先 | 末尾に半角スペース 3件 |
| 納期 | 空欄 6件 |
| 図面番号 | 先頭が `00` の値を含む |

このサンプルは、実際に起きた事象（外部システムの採番変更で、IDの先頭に拠点コードが付いた件）を
**架空のデータで再現**したものである。

---

## 9. テスト（Vitest）

`lib/` の関数に対して書く。UI のテストは v0.1 では不要。

| 対象 | 確認すること |
|---|---|
| `decode` | UTF-8 のバイト列 → `utf-8` と判定／Shift_JIS のバイト列 → `shift_jis` にフォールバック／BOM が除去される |
| `parse` | `00071048` が `"00071048"` のまま残る／引用符内のカンマ・改行が正しく扱われる／列数が足りない行が `""` で埋まる |
| `classify` | 6-3 の表の例がすべて期待どおりに分類される／空文字は `empty` |
| `profile` | 下の「受け入れ条件」の期待値を、**同梱サンプルを読み込んで**検証する |

---

## 10. 受け入れ条件

### 10-1. サンプルを読み込んだときの期待値

| 列 | 期待する警告 |
|---|---|
| **製造指示ID** | `LEN_MIXED`(info)、**`LEN_MINORITY`(warn)：10文字が10件** |
| 部品名 | `LEN_MIXED`(info) のみ |
| 図面番号 | `LEN_MIXED`(info)、`CLASS_MIXED`(info)、`LEADING_ZERO`(info) |
| 数量 | `LEN_MIXED`(info)、`CLASS_MIXED`(info)、**`FULLWIDTH_DIGIT`(warn)：2件** |
| 納期 | `MISSING`(info)：6件 |
| 得意先 | **`WHITESPACE`(warn)：3件**、`LEN_MIXED`(info) |

あわせて：

- 製造指示IDの長さ分布が **6：60 / 7：330 / 10：10**
- 長さ10のグループの先頭3文字が **`200`：10件**（上位1位）
- 検出した文字コードが **Shift_JIS**
- 注意（warn）の合計が **3件**

### 10-2. その他

- 値が一切変換されない（先頭の0、全角、前後の空白がそのまま表示される）
- `npm test` がすべて通る
- `npm run build` が通る
- ブラウザの開発者ツールで、ファイル読み込み時に外部への通信が発生していない
- 10万行 × 30列程度のCSVで、画面が操作不能にならない（数秒の待ちは許容）

---

## 11. 実装の進め方

**フェーズごとに止まって報告すること。** 次のフェーズには、確認を取ってから進む。
コミットもフェーズごとに、確認を取ってから行う。

### フェーズ1：土台と判定ロジック

- Vite + React + TypeScript でプロジェクトを作成
- `lib/`（decode / parse / classify / profile / rules / types）を実装
- テストを書き、**10-1 の期待値がテストで確認できる状態**にする
- 画面は最小限でよい（ファイルを選ぶと結果の JSON が表示される程度）

### フェーズ2：画面

- 7章の画面を実装
- サンプル読み込みボタン、文字コードの切替、見出し行の切替

### フェーズ3：公開

- README を書く（13章の文章を使う）
- `vite.config.ts` の `base` を `/intake-inspector/` に設定
- GitHub Actions で GitHub Pages にデプロイ

---

## 12. やらないこと（v0.1）

以下は**実装しないこと**。気づいた改善点は報告だけにとどめる。

- 前回のファイルとの比較
- 2つのファイルの突合
- 重複チェック、日付の妥当性チェック
- データの編集・保存・エクスポート
- サーバー、DB、ログイン
- Excel（.xlsx）の読み込み
- 先頭の文字数を変更する機能（v0.1 は3文字固定）
- Web Worker による並列化
- グラフライブラリ、UIフレームワークの導入
- 閾値を画面から変更する機能

---

## 13. README に入れる文章

以下をそのまま使う（体裁の調整は可）。

> # intake-inspector
>
> **Spot the silent anomalies in your CSV — before they break your matching.**
>
> CSVを読むだけで、「いつもと違う形の値」を見つける検査ツールです。
>
> ## なぜ作ったか
>
> 製造業の基幹システムから自動で取り込んでいたデータで、外部システムの採番ルールが予告なく変わり、
> IDの先頭に拠点コードが付くようになりました。
>
> 取込処理はエラーを出さずに成功し続けました。しかし分類ロジックが桁数で判定していたため、
> 進行中の受注が**静かに紐づかなくなって**いました。
>
> エラーが出ない壊れ方は、人が見に行かない限り見つかりません。
> intake-inspector は、列ごとに値の長さ・文字の種類・先頭の並びを集計し、
> **多数派から外れた値**を光らせます。
>
> 同梱のサンプルデータは、この事象を架空のデータで再現したものです。
>
> ## 特徴
>
> - **値を変えない。** すべて文字列として読み、先頭の0も全角も空白もそのまま表示します
> - **Shift_JIS に対応。** 文字コードは自動で判定します
> - **データを送らない。** ブラウザの中だけで動きます。サーバーはありません
>
> ## 使い方
>
> 1. CSVファイルをドロップする（または「サンプルを読み込む」を押す）
> 2. 列の一覧で、注意の付いた列を開く
> 3. 長さの分布と、長さ別の先頭3文字を確認する
>
> ## Author
>
> Hyde the Surveyor
