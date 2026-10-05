import { useEffect, useRef } from 'react'

// Androidの戻るボタン（とブラウザの「戻る」）をアプリ内の画面遷移に結びつける。
//
// 画面の切り替えはReactの状態だけで行っていてURLが変わらないため、そのままでは
// 戻るボタンで「1つ前のページ」＝アプリの外に出てしまう。
// ホーム以外にいる間だけ履歴に1段「見張り」を積み、それが消費されたら（＝戻るが押されたら）
// アプリ側で1つ上の画面に戻して、必要なら見張りを積み直す。
// ホームでは見張りを置かないので、戻るボタンで普通にアプリを閉じられる。

const GUARD = 'gken-drill-guard'

/** 説明シートなど、画面遷移より先に戻るボタンで閉じたいものの閉じ方。後に開いたものが優先 */
const handlers: (() => void)[] = []

/** 自分で history.back() したときに起きる popstate を無視する回数 */
let ignorePops = 0

function hasGuard(): boolean {
  const state = history.state as Record<string, unknown> | null
  return state?.[GUARD] === true
}

export function setGuard(on: boolean): void {
  if (on) {
    if (!hasGuard()) history.pushState({ [GUARD]: true }, '')
  } else if (hasGuard() && ignorePops === 0) {
    // ボタン操作でホームに戻ったときに残った見張りを片付ける。
    // 残すと、ホームで戻るを押しても1回目は何も起きなくなる
    ignorePops++
    history.back()
  }
}

/** 戻るボタンが押されたときの処理を登録する。onBack は画面を1つ上に戻す */
export function listenBack(onBack: () => void): () => void {
  const listener = () => {
    if (ignorePops > 0) {
      ignorePops--
      return
    }
    const top = handlers[handlers.length - 1]
    if (top) {
      top()
      // シートを閉じただけで画面は変わらないので、見張りをここで積み直す
      setGuard(true)
    } else {
      onBack()
    }
  }
  window.addEventListener('popstate', listener)
  return () => window.removeEventListener('popstate', listener)
}

/** 戻るボタンで呼ぶ処理を積む。返り値で取り除く */
export function pushBackHandler(fn: () => void): () => void {
  const h = () => fn()
  handlers.push(h)
  setGuard(true)
  return () => {
    const i = handlers.lastIndexOf(h)
    if (i >= 0) handlers.splice(i, 1)
  }
}

/** active の間、戻るボタンで fn を呼ぶ（画面遷移より優先） */
export function useBackHandler(active: boolean, fn: () => void): void {
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })
  useEffect(() => {
    if (!active) return
    return pushBackHandler(() => fnRef.current())
  }, [active])
}
