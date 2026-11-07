import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyViewportChange,
  forgetEditorViews,
  getEditorView,
  getMountGeneration,
  isRestoredViewport,
  relocateEditorViews,
  resetEditorViewState,
  resolveEditorView,
  saveEditorView,
  setActiveRoot
} from '../src/renderer/src/components/TextEditor/editorViewState.mjs'

const plainView = {
  mode: 'plain',
  scrollTop: 240,
  scrollLeft: 12,
  selectionStart: 80,
  selectionEnd: 90
}

test.beforeEach(() => {
  resetEditorViewState()
})

test('保存したビューポートをファイルパスごとに取り出せる', () => {
  assert.equal(saveEditorView('/notes/a.txt', plainView), true)
  assert.deepEqual(getEditorView('/notes/a.txt'), plainView)
  assert.equal(getEditorView('/notes/missing.txt'), null)
})

test('不正なビューは保存しない', () => {
  assert.equal(saveEditorView('/notes/a.txt', { mode: 'rich', scrollTop: 10 }), false)
  assert.equal(saveEditorView('/notes/a.txt', { mode: 'plain', scrollTop: Number.NaN }), false)
  assert.equal(getEditorView('/notes/a.txt'), null)
})

test('内容が短くなったらスクロールと選択範囲を範囲内に収める', () => {
  const resolved = resolveEditorView(plainView, {
    mode: 'plain',
    contentLength: 40,
    maxScrollTop: 100,
    maxScrollLeft: 0
  })
  assert.deepEqual(resolved, {
    scrollTop: 100,
    scrollLeft: 0,
    selectionStart: 40,
    selectionEnd: 40,
    restoreSelection: true
  })
})

test('別モードのファイルではスクロールだけ復元する', () => {
  const resolved = resolveEditorView(plainView, {
    mode: 'markdown',
    contentLength: 200,
    maxScrollTop: 500,
    maxScrollLeft: 20
  })
  assert.equal(resolved.restoreSelection, false)
  assert.equal(resolved.scrollTop, 240)
  assert.equal(resolved.selectionStart, 0)
  assert.equal(resolved.selectionEnd, 0)
})

test('復元直後の同じ位置はユーザー操作として扱わない', () => {
  const metrics = {
    mode: 'plain',
    contentLength: 200,
    maxScrollTop: 500,
    maxScrollLeft: 40,
    scrollTop: 240.4,
    scrollLeft: 12,
    selectionStart: 80,
    selectionEnd: 90
  }
  const resolved = resolveEditorView(plainView, metrics)
  assert.equal(isRestoredViewport(metrics, resolved), true)
  assert.equal(classifyViewportChange({ saved: plainView, metrics, mode: 'plain' }), 'ignore')
})

test('カーソルだけ動いた場合は新しい位置を採用する', () => {
  const metrics = {
    contentLength: 200,
    maxScrollTop: 500,
    maxScrollLeft: 40,
    scrollTop: 240,
    scrollLeft: 12,
    selectionStart: 10,
    selectionEnd: 10
  }
  assert.equal(classifyViewportChange({ saved: plainView, metrics, mode: 'plain' }), 'adopt')
})

test('レイアウト前のスクロール0で保存位置を潰さない', () => {
  const metrics = {
    contentLength: 200,
    maxScrollTop: 0,
    maxScrollLeft: 0,
    scrollTop: 0,
    scrollLeft: 0,
    selectionStart: 0,
    selectionEnd: 0
  }
  assert.equal(classifyViewportChange({ saved: plainView, metrics, mode: 'plain' }), 'ignore')
})

test('未訪問ファイルは保存がなく、先頭から始める', () => {
  assert.equal(getEditorView('/notes/new.txt'), null)
  assert.equal(classifyViewportChange({
    saved: null,
    metrics: {
      contentLength: 10,
      maxScrollTop: 0,
      maxScrollLeft: 0,
      scrollTop: 40,
      scrollLeft: 0,
      selectionStart: 2,
      selectionEnd: 2
    },
    mode: 'plain'
  }), 'adopt')
})

test('削除したファイルの古いマウントからは保存できず、開き直し後は保存できる', () => {
  const mounted = getMountGeneration('/notes/a.txt')
  saveEditorView('/notes/a.txt', plainView, mounted)
  forgetEditorViews('/notes/a.txt')

  assert.equal(getEditorView('/notes/a.txt'), null)
  assert.equal(saveEditorView('/notes/a.txt', { ...plainView, scrollTop: 10 }, mounted), false)
  assert.equal(getEditorView('/notes/a.txt'), null)

  const reopened = getMountGeneration('/notes/a.txt')
  assert.notEqual(reopened, mounted)
  assert.equal(saveEditorView('/notes/a.txt', { ...plainView, scrollTop: 16 }, reopened), true)
  assert.equal(getEditorView('/notes/a.txt').scrollTop, 16)
})

test('ディレクトリ削除では配下だけ捨てる', () => {
  saveEditorView('/proj/dir/a.txt', plainView)
  saveEditorView('/proj/dir/nested/b.txt', { ...plainView, scrollTop: 8 })
  saveEditorView('/proj/dir-extra/c.txt', { ...plainView, scrollTop: 3 })
  saveEditorView('/proj/other.txt', { ...plainView, scrollTop: 4 })

  forgetEditorViews('/proj/dir')

  assert.equal(getEditorView('/proj/dir/a.txt'), null)
  assert.equal(getEditorView('/proj/dir/nested/b.txt'), null)
  assert.equal(getEditorView('/proj/dir-extra/c.txt').scrollTop, 3)
  assert.equal(getEditorView('/proj/other.txt').scrollTop, 4)
  assert.equal(saveEditorView('/proj/dir/a.txt', plainView, 0), false)
})

test('リネーム後の古いエディタは新しいパスへ位置を書き込む', () => {
  const mounted = getMountGeneration('/proj/dir/a.txt')
  saveEditorView('/proj/dir/a.txt', plainView, mounted)
  relocateEditorViews('/proj/dir', '/proj/dir2')

  assert.equal(getEditorView('/proj/dir/a.txt'), null)
  assert.equal(getEditorView('/proj/dir2/a.txt').scrollTop, 240)

  assert.equal(saveEditorView('/proj/dir/a.txt', { ...plainView, scrollTop: 25 }, mounted), true)
  assert.equal(getEditorView('/proj/dir2/a.txt').scrollTop, 25)
  assert.equal(getEditorView('/proj/dir/a.txt'), null)

  const reopened = getMountGeneration('/proj/dir/a.txt')
  saveEditorView('/proj/dir/a.txt', { ...plainView, scrollTop: 3 }, reopened)
  assert.equal(getEditorView('/proj/dir/a.txt').scrollTop, 3)
  assert.equal(getEditorView('/proj/dir2/a.txt').scrollTop, 25)
})

test('リネーム後に削除したファイルへは古いエディタから復活させない', () => {
  const mounted = getMountGeneration('/notes/a.txt')
  saveEditorView('/notes/a.txt', plainView, mounted)
  relocateEditorViews('/notes/a.txt', '/notes/b.txt')
  forgetEditorViews('/notes/b.txt')

  assert.equal(saveEditorView('/notes/a.txt', { ...plainView, scrollTop: 50 }, mounted), false)
  assert.equal(getEditorView('/notes/b.txt'), null)
})

test('フォルダを切り替えると位置情報を捨て、外のパスは保存しない', () => {
  setActiveRoot('/proj')
  assert.equal(saveEditorView('/proj/a.txt', plainView), true)
  assert.equal(saveEditorView('/other/a.txt', plainView), false)

  setActiveRoot('/proj')
  assert.equal(getEditorView('/proj/a.txt').scrollTop, 240)

  setActiveRoot('/other')
  assert.equal(getEditorView('/proj/a.txt'), null)
  assert.equal(saveEditorView('/proj/a.txt', plainView, 0), false)
  assert.equal(saveEditorView('/other/b.txt', { ...plainView, scrollTop: 7 }), true)
  assert.equal(getEditorView('/other/b.txt').scrollTop, 7)
})

test('連続リネームでも古いエディタの保存は最終パスに届く', () => {
  const mounted = getMountGeneration('/proj/a.txt')
  saveEditorView('/proj/a.txt', plainView, mounted)
  relocateEditorViews('/proj/a.txt', '/proj/b.txt')
  relocateEditorViews('/proj/b.txt', '/proj/c.txt')

  assert.equal(saveEditorView('/proj/a.txt', { ...plainView, scrollTop: 33 }, mounted), true)
  assert.equal(getEditorView('/proj/c.txt').scrollTop, 33)
  assert.equal(getEditorView('/proj/a.txt'), null)
  assert.equal(getEditorView('/proj/b.txt'), null)
})

test('Windowsの区切りでも配下判定する', () => {
  saveEditorView('C:\\notes\\a.txt', plainView)
  saveEditorView('C:\\notes-extra\\b.txt', { ...plainView, scrollTop: 5 })
  forgetEditorViews('C:\\notes')
  assert.equal(getEditorView('C:\\notes\\a.txt'), null)
  assert.equal(getEditorView('C:\\notes-extra\\b.txt').scrollTop, 5)

  relocateEditorViews('C:\\notes-extra', 'C:\\archive')
  assert.equal(getEditorView('C:\\archive\\b.txt').scrollTop, 5)
})
