# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Yohaku. は Electron + React で構築されたミニマルなテキストエディタ。ファイルエクスプローラー + テキストエディタ + 見出しアウトラインの3ペイン構成で、自動保存機能とファイル/ディレクトリ管理機能を備える。

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
  refreshSignal: number,        // ツリーをリマウントせずにリフレッシュするカウンター
  headingChar: string,          // 見出しプレフィックス文字（デフォルト '#'）
  sidebarLayout: string         // サイドバー配置（'default' | 'swap'）
}
```

**主要アクション：**
- `SET_ROOT` - 新しいディレクトリを開く（状態リセット、ただし `headingChar` と `sidebarLayout` は保持）
- `OPEN_FILE` - ファイルをエディタに読み込み
- `UPDATE_CONTENT` - 内容を編集（isDirtyをセット）
- `SAVE_FILE` - 保存済みとしてマーク
- `REFRESH_TREE` - ツリー更新 + refreshSignalをインクリメント
- `SET_HEADING_CHAR` - 見出し文字を変更
- `SET_SIDEBAR_LAYOUT` - サイドバー配置を変更

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
- `fs:searchInDirectory` - ディレクトリ内キーワード検索（再帰的、大文字小文字区別なし、最大500件）

**シェル操作：**
- `shell:openExternal` - 外部ブラウザでURLを開く

**ダイアログ操作：**
- `dialog:openDirectory` - システムディレクトリ選択ダイアログ

**履歴操作：**
- `history:get` / `history:add` - ディレクトリ履歴の読み書き

**設定操作：**
- `settings:get` / `settings:set` - アプリ設定の読み書き（`app.getPath('userData')/settings.json`）
- `DEFAULT_SETTINGS`: `{ hotkey, headingChar, sidebarLayout }`

### コンポーネント構成

```
App.jsx（ルート — AppProvider > AppContent）
├─ FileExplorer（サイドバー）
│  ├─ TreeNode（再帰的ツリー）
│  ├─ SearchPanel（ディレクトリ内キーワード検索）
│  ├─ ContextMenu（右クリックメニュー）
│  ├─ InputDialog（新規作成/リネーム用モーダル、Portal経由でbodyに描画）
│  ├─ DirectoryPicker（ディレクトリ履歴ポップアップ）
│  └─ Settings（設定モーダル、Portal経由でbodyに描画）
├─ Resizer（ドラッグ可能な区切り線）
├─ TextEditor（forwardRef、エディタペイン）
│  └─ SearchBar（Ctrl+F検索）
├─ Resizer（アウトラインリサイザー、outlineVisible時のみ）
└─ HeadingOutline（見出しアウトラインサイドバー、outlineVisible時のみ）
```

### サイドバーレイアウト

`sidebarLayout` 設定で左右配置を切り替え可能：
- `'default'`: Explorer（左）| Editor | Outline（右）
- `'swap'`: Outline（左）| Editor | Explorer（右）

`App.jsx` は `AppContent` コンポーネントに分離（`AppProvider` 内で `useAppDispatch` を使うため）。Resizerのドラッグ方向も `sidebarLayout` に応じて反転する。

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

### ディレクトリ内キーワード検索

- サイドバー下部の虫眼鏡アイコンで検索モードに切替（ツリー表示と排他）
- 検索モード時はアイコンがフォルダアイコンに変わり、押すとツリー表示に戻る
- `SearchPanel.jsx` で300msデバウンス付き検索入力、結果クリックでファイルを開く
- メインプロセスの `searchInDirectory` がディレクトリを再帰走査しテキストファイルのみ検索
- 隠しファイル（`.`始まり）・`node_modules`・バイナリファイルはスキップ
- 結果上限500件、ヒット箇所は黄色ハイライト表示
- Escapeキーで検索パネルを閉じる

### URLリンク機能

TextEditor内のURLテキスト（`https?://...`）にホバーするとアンダーラインが表示され、Ctrl+クリックで外部ブラウザで開く：
- テキストと同期スクロールするURLオーバーレイレイヤーで実装
- URL span要素に `pointer-events: auto` を設定し、CSSの `:hover` でアンダーライン表示
- クリック時はtextareaにカーソル配置（`caretRangeFromPoint` で位置計算）、Ctrl+クリック時のみURL を開く
- URL上でのスクロール（wheel）イベントはtextareaに転送

### 見出しアウトライン

エディタヘッダーのトグルボタンで表示/非表示を切り替え：
- `parseHeadings(content, char)` で行頭プレフィックス文字を検出（繰り返し回数がレベル）
- `buildHeadingTree(headings)` でフラットリストをスタックベースでネストしたツリーに変換
- クリック時は `editorRef.current.scrollToLine(lineIndex)` でジャンプ
- TextEditor は `forwardRef` + `useImperativeHandle` で `scrollToLine` を公開
- スクロール位置はミラーdiv方式で計算（textareaのコンテンツ幅を正確に再現し `marker.offsetTop` を取得）
- 見出し文字は Settings で変更可能（`headingChar` 状態）
- HeadingOutline の境界線（border）は `sidebarLayout` に応じて左右が切り替わる

### 実装上の重要な注意点

1. **window.prompt()は使用不可** - Electronでは動作しないため `InputDialog` コンポーネントを使用
2. **TreeNodeのリマウント問題** - `key` propの変更ではなく `refreshSignal` パターンを使用すること
3. **コンテキストメニューの対象特定** - `data-path` 属性のバブリングに依存
4. **自動保存のデバウンス** - useEffectのreturnでタイマーをクリーンアップすること
5. **メニューバー非表示** - メインプロセスで `Menu.setApplicationMenu(null)` を設定
6. **ファイルシステムアクセス** - レンダラーから直接Node.js APIを使わず、必ずIPC経由で操作
7. **モーダルダイアログは `createPortal` 必須** - FileExplorer（`.explorer`）と TextEditor に `contain: size layout style` / `contain: strict` が設定されており、`position: fixed` の包含ブロックが変わるため、`InputDialog` と `Settings` は `createPortal(jsx, document.body)` でレンダリングすること。新しいモーダルを追加する場合も同様
8. **新規ファイル作成時の拡張子** - ユーザーが拡張子を入力しなかった場合、自動で `.txt` を付与する（`FileExplorer.jsx` の `handleDialogSubmit`）
9. **SET_ROOTで設定を保持** - `SET_ROOT` は `initialState` にリセットするが、`headingChar` と `sidebarLayout` は現在の `state` から引き継ぐこと。新しい永続設定を追加する場合も同様に保持が必要
10. **設定の起動時読み込み** - `AppContent` の `useEffect` で `settings:get` を呼び、`headingChar` と `sidebarLayout` を dispatch する。新しい設定項目を追加した場合もここで読み込むこと
