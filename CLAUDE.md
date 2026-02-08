# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Yohaku. は Electron + React で構築されたミニマルなテキストエディタ。2カラムレイアウト（ファイルエクスプローラー + テキストエディタ）で、自動保存機能とファイル/ディレクトリ管理機能を備える。

## 開発コマンド

```bash
npm install          # 依存関係インストール
npm run dev          # 開発モード（ホットリロード付き）
npm run build        # プロダクションビルド（out/ に出力）
npm run dist         # 配布用パッケージ作成（全プラットフォーム）
npm run dist:win     # Windows用のみ（.exe インストーラー + ポータブル）
```

## アーキテクチャ

### Electronプロセスモデル

3つの分離されたプロセスで構成：

1. **メインプロセス** (`src/main/`)
   - `index.js` - ウィンドウ作成、ライフサイクル管理。メニューバーは `Menu.setApplicationMenu(null)` で非表示
   - `ipc-handlers.js` - ファイル操作・ディレクトリ履歴の全IPCハンドラ
   - `menu.js` - アプリメニュー定義（メニューバー非表示のため現在未使用）

2. **プリロードスクリプト** (`src/preload/index.js`)
   - `contextBridge` でレンダラーに安全なAPIを公開
   - `window.electronAPI` としてファイル操作メソッドを提供
   - メニューイベントリスナーはSet型による複数リスナー方式

3. **レンダラープロセス** (`src/renderer/`)
   - 外部状態管理ライブラリなしのReactアプリ
   - `useReducer` + Context API でグローバル状態管理

### 状態管理

`AppContext.jsx` の `useReducer` で一元管理：

**状態構造：**
```javascript
{
  rootPath: string | null,      // 開いているディレクトリ
  tree: array,                  // ファイルツリー構造
  currentFile: string | null,   // 編集中のファイルパス
  content: string,              // エディタの現在の内容
  savedContent: string,         // 最後に保存した内容
  isDirty: boolean,             // 未保存変更フラグ
  refreshSignal: number         // ツリーをリマウントせずにリフレッシュするカウンター
}
```

**主要アクション：**
- `SET_ROOT` - 新しいディレクトリを開く（状態リセット）
- `OPEN_FILE` - ファイルをエディタに読み込み
- `UPDATE_CONTENT` - 内容を編集（isDirtyをセット）
- `SAVE_FILE` - 保存済みとしてマーク
- `REFRESH_TREE` - ツリー更新 + refreshSignalをインクリメント

### ファイルツリー描画

遅延読み込みの再帰コンポーネントで実装：

- `TreeNode.jsx` は `refreshSignal` を監視し、アンマウントせずに子要素をリロード（展開/折りたたみ状態を保持）
- ディレクトリは展開時にのみ子要素を読み込み
- 右クリックコンテキストメニューでファイル/フォルダ操作
- `data-path` と `data-is-directory` 属性でコンテキストメニューの対象を特定

### 自動保存

TextEditorで1秒のデバウンス付き自動保存を実装：
```javascript
useEffect(() => {
  if (!currentFile || !isDirty) return
  const timer = setTimeout(async () => {
    await window.electronAPI.writeFile(currentFile, content)
    dispatch({ type: 'SAVE_FILE' })
  }, 1000)
  return () => clearTimeout(timer)
}, [content, currentFile, isDirty, dispatch])
```

### ディレクトリ履歴

- `app.getPath('userData')/directory-history.json` に保存
- 最大10件の最近のディレクトリを保持
- アプリ起動時に最後のディレクトリを自動読み込み
- `history:get` と `history:add` IPCハンドラで管理

### IPC通信

全ファイルシステム操作は `src/main/ipc-handlers.js` のIPCハンドラ経由：

**ファイル操作：**
- `fs:readDirectory` - ツリー構築（`.` で始まる隠しファイルはスキップ）
- `fs:readFile` / `fs:writeFile` - UTF-8テキストのみ対応
- `fs:createFile` / `fs:createDirectory` - 新規作成
- `fs:rename` - ファイル/ディレクトリのリネーム
- `fs:deleteFile` / `fs:deleteDirectory` - 削除
- `fs:checkDirectoryEmpty` - ディレクトリ削除前の空チェック

**ダイアログ操作：**
- `dialog:openDirectory` - システムディレクトリ選択ダイアログ

**履歴操作：**
- `history:get` / `history:add` - ディレクトリ履歴の読み書き

### コンポーネント構成

```
App.jsx（ルート）
├─ FileExplorer（左サイドバー）
│  ├─ TreeNode（再帰的ツリー）
│  ├─ ContextMenu（右クリックメニュー）
│  ├─ InputDialog（新規作成/リネーム用モーダル）
│  └─ DirectoryPicker（ディレクトリ履歴ポップアップ）
├─ Resizer（ドラッグ可能な区切り線）
└─ TextEditor（右ペイン）
   └─ SearchBar（Ctrl+F検索）
```

### ビルドシステム

- `electron-vite`（Electron用Vite）を使用
- 設定: `electron.vite.config.mjs`
- Reactプラグインはレンダラープロセスのみ
- 出力ディレクトリ: `out/`
- 配布設定: `electron-builder.yml`

### Windowsビルドの注意点

- WSL2からのクロスコンパイルにはWineが必要（`wine64` + `wine32:i386`）
- Wine初期化: `rm -rf ~/.wine && wineboot --init`
- NSISインストーラーとポータブル版の両方を生成
- アイコンは256x256ピクセル以上（`build/icon.ico` に配置）

### パス処理

- 独自の `pathUtil.js` でWindows（`\`）とUnix（`/`）の両方のセパレータに対応
- `path.includes('\\')` でセパレータを判定
- ツリーデータ構造は `node.path` に絶対パスを保持

### CSSモジュール

全コンポーネントでスコープ付きCSSモジュールを使用：
- ファイル命名: `ComponentName.module.css`
- インポート: `import styles from './ComponentName.module.css'`
- 使用: `className={styles.className}`

### コンテキストメニュー

右クリック対象に応じてメニュー項目が変化：
- 空白部分/ディレクトリ: New File, New Folder
- ファイル/ディレクトリ: 上記 + Rename, Delete
- ファイル削除時は確認、空でないディレクトリ削除時は追加警告

### CI/CD（GitHub Actions）

- ワークフロー: `.github/workflows/release.yml`
- **トリガー:** `v*` タグのプッシュ（例: `v1.0.3`）
- **ビルド対象:** Windows (.exe) on `windows-latest`、Linux (.AppImage) on `ubuntu-latest`
- マトリクスで2ジョブ並列実行（`fail-fast: false`）
- `electron-builder` は `--publish never` で自動パブリッシュを無効化
- リリース作成は `softprops/action-gh-release@v2` が担当（`permissions: contents: write` が必要）
- Node.js 22 を使用（`node-abi` が `>=22.12.0` を要求するため）

**リリース手順：**
```bash
# 1. package.json の version を更新
# 2. コミット & タグ作成 & プッシュ
git add package.json
git commit -m "v1.0.x"
git tag v1.0.x
git push origin main --tags
```

### 実装上の重要な注意点

1. **window.prompt()は使用不可** - Electronでは動作しないため `InputDialog` コンポーネントを使用
2. **TreeNodeのリマウント問題** - `key` propの変更ではなく `refreshSignal` パターンを使用すること
3. **コンテキストメニューの対象特定** - `data-path` 属性のバブリングに依存
4. **自動保存のデバウンス** - useEffectのreturnでタイマーをクリーンアップすること
5. **メニューバー非表示** - メインプロセスで `Menu.setApplicationMenu(null)` を設定
6. **ファイルシステムアクセス** - レンダラーから直接Node.js APIを使わず、必ずIPC経由で操作
