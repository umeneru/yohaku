# Markdownリッチエディタ実装runbook

## 実装順

1. Tiptap 3、公式Markdown拡張、GFM用extensionを同一versionで導入する。
2. `.md` / `.markdown`判定と、対応外構文の安全フォールバック判定を追加する。
3. 既存textareaを`PlainTextEditor`として維持し、Markdownだけ`MarkdownEditor`へ分岐する。
4. Markdownのparse→serialize→parseが安定することを確認してから文書を表示する。
5. 固定ツールバー、Markdown input shortcuts、Web paste、検索・置換を接続する。
6. ProseMirror heading nodeからアウトラインを生成する。
7. clipboard画像のPNG保存と、相対画像の安全な表示をIPC経由で実装する。
8. 新規ファイルの既定拡張子を`.md`へ変更する。
9. 自動テスト、build、手動UIシナリオで検証する。

## 主な実装箇所

- `src/renderer/src/components/TextEditor/MarkdownEditor.jsx`
- `src/renderer/src/components/TextEditor/PlainTextEditor.jsx`
- `src/renderer/src/components/TextEditor/MarkdownToolbar.jsx`
- `src/renderer/src/components/TextEditor/MarkdownImageView.jsx`
- `src/renderer/src/components/TextEditor/markdownSupport.mjs`
- `src/renderer/src/components/TextEditor/richSearch.mjs`
- `src/renderer/src/hooks/useRichSearchReplace.js`
- `src/main/ipc-handlers.js`
- `src/preload/index.js`
- `test/markdown/`

## 実行コマンド

```bash
npm install
npm test
npm run build
git diff --check
git status --short
```

## 詰まりどころ

- `@tiptap/markdown`はBetaなので、Tiptap packagesを個別更新せず同一versionに揃える。
- 初期loadで`UPDATE_CONTENT`を発火すると、開いただけでMarkdownが正規化保存されるため禁止する。
- React再描画ごとに`setContent`するとUndo履歴と選択位置が消えるため、ファイル切り替え時だけeditorを再生成する。
- Markdown文字offset、プレーンテキスト行番号、ProseMirror positionを混用しない。
- raw HTML、Front Matter、脚注、directive、wiki link、数式はリッチ変換せず安全フォールバックする。
- ローカル画像はrendererから`file:`で直接開かず、main processで相対pathを解決してdata URL化する。
- 画像paste中にファイルが切り替わった場合は挿入を中止する。作成済み画像の自動cleanupはしない。
- modalは`contain: strict`の影響を避けるため`createPortal`を使う。

## 自動検証

- [x] Markdown拡張子判定
- [x] 基本Markdown + GFMの対応判定
- [x] 対応外構文のフォールバック判定
- [x] Tiptap parse→serialize→parseの意味構造維持
- [x] mark境界内検索とblock境界除外
- [x] `npm test`
- [x] `npm run build`
- [x] `git diff --check`
- [x] production dependenciesの`npm audit`

## 手動確認

- [ ] 既存Markdownを開いただけでは保存されない
- [ ] toolbar、keyboard、IME、Undo / Redoが動作する
- [ ] 自動保存中の追加入力・ファイル切り替えでdirty状態が壊れない
- [ ] 検索・置換がmarksを可能な範囲で維持する
- [ ] outlineクリックでsemantic headingへ移動する
- [ ] Ctrl/Cmd+クリックだけでHTTPSリンクを開く
- [ ] clipboard画像が`assets/image-YYYYMMDD-HHmmss.png`へ保存される
- [ ] 相対画像とHTTPS画像だけが表示される
- [ ] 対応外Markdownは元文字列を変更せずplain editorへ切り替わる
- [ ] `.txt`等は従来のplain editorで編集できる

## 完了条件

- 自動検証がすべて成功する。
- 実機UI確認でデータ損失や既存plain editorの退行がない。
- 対象外機能を追加しない。
