# Markdown WYSIWYG Editor

## 背景

Yohaku. のプレーンテキスト編集を維持しつつ、Markdown文書を整形結果のまま編集・表示できるようにする。

## スコープ

- `.md` / `.markdown`だけを常時リッチ編集する
- Markdown文字列をファイルの正本とする
- 基本Markdown + GFM（取り消し線、タスクリスト、表）を扱う
- 対応外構文は理由を示してプレーンテキストへ安全フォールバックする
- 固定ツールバー、自動保存、検索・置換、リンク、semantic outlineを提供する
- 貼り付け画像を同階層の`assets/`へPNG保存し、相対参照する
- Markdown以外は既存のプレーンテキスト編集を維持する

## 確定事項

- [ADR 0001: Markdownテキストを保存形式とする](./adr/0001-markdown-source-of-truth.md)
- [ADR 0002: Tiptap公式Markdown拡張を採用する](./adr/0002-tiptap-markdown-beta.md)
- [ADR 0003: 画像資産を共有assetsディレクトリへ保存する](./adr/0003-shared-image-assets-directory.md)

## 実装

- ブランチ: `feat/markdown-rich-editor`
- [Runbook 01: Markdownリッチエディタ実装](./runbook/01-implement-markdown-rich-editor.md)
- 自動テスト、production build、差分形式検査は成功
- Electron実機での手動UI確認は未実施

## 未解決事項

- なし。実機確認で見つかった不具合のみ追加対応する。
