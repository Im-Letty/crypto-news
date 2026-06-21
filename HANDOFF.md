# Crypto News サイト 引き継ぎ資料

このドキュメントは、本プロジェクトをゼロからでも引き継げるようにまとめた資料です。

## 1. プロジェクト概要
暗号資産（仮想通貨）のニュースを配信する日本語の無料Webサイト。各メディアの公式RSSから「暗号資産関連の注目ニュース上位3件」を毎日朝9時（JST）に自動取得して表示する。あわせて価格ティッカー（流れる価格バー）を表示する。

## 2. 重要な前提・制約（必ず守る）
- 完全無料で運用：GitHub Pages（ホスティング）、GitHub Actions（自動更新）、CoinGecko無料API（価格・銘柄リスト）、公式RSS。有料サービスは一切使わない。
- 著作権配慮：ニュースは「見出し＋出典メディア名＋元記事リンク」のみ。本文の全文転載はしない。免責事項を必ず表示する。
- 暗号資産関連のみを扱う。日本語サイト。
- あいまい・誤字の多い指示は、編集・コミット前に必ず確認する運用方針。
- 価格はUSDをメイン（白・大きめ）、JPYをサブ（小さい灰色）、24h変動を緑（上昇）／赤（下落）で表示。
- 銘柄選択は最大6銘柄。デフォルトは BTC / ETH / XRP / SOL。選択内容はブラウザのlocalStorageに保存。

## 3. 場所・アクセス情報
- GitHubオーナー：Im-Letty（Enterprise）
- リポジトリ：Im-Letty/crypto-news（Public）
- 公開URL（本番サイト）：https://im-letty.github.io/crypto-news/

## 4. ファイル構成
- index.html … サイト本体（HTML/CSS/JS全部入り）。編集はほぼここ。
- news.json … 自動生成されるニュース上位3件（手動編集不要）。
- scripts/fetch-news.js … RSS取得・スコアリング・news.json生成スクリプト。
- .github/workflows/fetch-news.yml … 毎日朝9時JST（cron: 0 0 * * *）＋手動実行で上記を走らせるワークフロー。

## 5. 仕組みの詳細

### ニュース自動取得（fetch-news.js）
- 取得元RSS：
  - CoinPost: https://coinpost.jp/?feed=rss2
  - BITTIMES: https://bittimes.net/feed
  - CRYPTO TIMES: https://crypto-times.jp/feed/
  - CoinTelegraph: https://cointelegraph.com/rss
- 各媒体から20件候補を集め、暗号資産キーワードで絞り込み。
- スコア＝注目度（ビットコイン/ETF/規制/急騰・急落 等の重み付け）＋新しさ（24時間以内が満点、約7日でほぼ0）。
- スコア降順・同点なら新しい順で上位3件をnews.jsonへ書き出し。
- 注意：RSS取得に Accept ヘッダーは付けない（CRYPTO TIMESで415エラーになるため）。User-Agentは付与済み。

### 価格ティッカー・銘柄選択（index.htmlのJS）
- CoinGecko /simple/price（2分ごと更新）と /coins/list（検索用）を使用。
- 有名どころ8銘柄（BTC/ETH/XRP/SOL/DOGE/BNB/ADA/TRX）はクイック選択ボタン（4列グリッドで4×2に折り返し）。それ以外はモーダル内の検索で追加。
- localStorageキー：cryptonews_ticker_coins（選択銘柄）と cryptonews_ticker_coins_labels（ラベル）。
- ティッカーの流れる速さは銘柄数に応じて自動調整（銘柄数×13秒）。

## 6. 現在のUIの状態（これまでの変更を反映）
- ヘッダーバー（黒帯）とロゴ「CryptoNews」は削除済み。ナビ（ホーム/ニュース/相場/運営情報）も削除済み。
- ページ先頭はヒーロー見出し「暗号資産の最新ニュースをお届け」（サブテキストは削除済み）。
- ヒーローのすぐ下に価格ティッカー（.ticker-section）。その右下に歯車アイコン＋「銘柄を編集」ボタン。
- その下にニュースカード（出典リンク付き）→ 一番下に「最終更新：…（3件）」（右寄せ）。
- フッターに免責事項とコピーライト。
- 銘柄選択モーダル：見出し「表示する銘柄を選択」、カウンター「X / 6 銘柄を選択中」、クイック選択ボタン、検索ボックスのみ。選択チップ表示・説明文「ティッカーに流す暗号資産を選べます」は削除済み。

## 7. テーマカラー
- オレンジ #f7931a
- ティッカー背景 #0a0c10
- ヒーロー #161b22
- フッター #0d1117
- ページ背景 #f5f6f8

## 8. index.html 編集の手順（コツ込み）
1. https://github.com/Im-Letty/crypto-news/edit/main/index.html を開く。
2. コードのテキスト（1行目あたり）を直接クリックしてから Cmd+A → Delete。1回で消えないことが多いので「Enter file contents here」になるまでクリック＋リトライ。
3. 一括挿入：document.querySelector('.cm-content').focus() の後に document.execCommand('insertText', false, 内容)。
4. Cmd+Up で先頭が崩れていないか確認。
5. 「Commit changes…」をクリック（1回目はスクロールするだけのことがあるので2回押す）。緑の「Commit changes」で確定。
6. GitHub Pagesの反映に約40秒（リロード2回分）かかる。?v=連番 を付けて再読み込みし、DOM/JSで検証（最初は古いキャッシュが出る）。

## 9. その他の注意・既知の事象
- raw.githubusercontent.com へのJS fetchはブロックされる → rawのURLにナビゲートして get_page_text で読む。
- CodeMirrorは表示中の行しかDOMに無いため、innerText検証は不完全。最終確認は本番サイトのDOMで行う。

## 10. 今後やれる候補（未着手）
- 運営情報／お問い合わせ／利用規約／プライバシーポリシーの各ページ作成。
- 追加RSSの組み込み。

