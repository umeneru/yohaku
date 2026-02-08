# Yohaku.

シンプルなテキストエディタ。

## 特徴

- 2カラムレイアウト（ファイルエクスプローラー + テキストエディタ）
- ディレクトリツリーの展開/折りたたみ
- テキストファイルの編集と自動保存
- ファイル/ディレクトリの作成・リネーム・削除（右クリックメニュー）
- 検索と置換（Ctrl+F）
- サイドバーのリサイズ
- ディレクトリ履歴（最大10件）

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run dev
```

## ビルド

```bash
npm run build          # プロダクションビルド
npm run dist:win       # Windows用配布パッケージ作成
```

## ダウンロード

[GitHub Releases](../../releases) から Windows (.exe) / Linux (.AppImage) をダウンロードできます。

## リリース手順

```bash
# 1. package.json の version を更新
# 2. コミット
git add package.json
git commit -m "v1.0.1"
# 3. タグを作成してプッシュ
git tag v1.0.1
git push origin main --tags
```

タグのプッシュで GitHub Actions が自動的にビルド・リリースを作成します。

## 技術スタック

- **Electron** - デスクトップアプリケーションフレームワーク
- **React** - UIコンポーネントライブラリ
- **electron-vite** - ホットリロード対応ビルドツール
- **CSS Modules** - スコープ付きスタイリング
