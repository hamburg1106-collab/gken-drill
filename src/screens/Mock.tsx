import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '../data'
import { useBackHandler } from '../lib/backButton'
import type { MockSession } from '../lib/mock'
import { MOCK_MODES, clock, saveSession } from '../lib/mock'
import type { QuizItem } from '../lib/quiz'

type Props = {
  initial: MockSession
  items: QuizItem[]
  /** 途中から再開したときは一時停止の状態で開く */
  resumed: boolean
  onFinish: (answers: (number | null)[], usedMs: number, timeUp: boolean) => void
  /** 採点せずにやめる（記録に残さない） */
  onDiscard: () => void
  /** 途中の状態を残したままホームに戻る */
  onLeave: () => void
}

/** 選択肢を押してから次の問題へ進むまでの間。押した選択肢が分かるように一瞬だけ見せる */
const ADVANCE_MS = 220

export function Mock({ initial, items, resumed, onFinish, onDiscard, onLeave }: Props) {
  const mode = MOCK_MODES[initial.mode]
  const [s, setS] = useState<MockSession>(initial)
  // 動いている間だけ時刻を持つ。null なら一時停止中
  const [runningSince, setRunningSince] = useState<number | null>(() => (resumed ? null : Date.now()))
  const [now, setNow] = useState(() => Date.now())
  const [gridOpen, setGridOpen] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const finished = useRef(false)
  const advanceTimer = useRef<number | undefined>(undefined)

  const elapsed = s.elapsedMs + (runningSince ? Math.max(0, now - runningSince) : 0)
  const remaining = mode.limitMs - elapsed
  const paused = runningSince === null
  const answeredCount = s.answers.filter((a) => a !== null).length
  const unanswered = items.length - answeredCount
  const flagged = s.flags.filter(Boolean).length
  // 本番と同じペースなら、いま何問目にいるはずか
  const paceIndex = Math.min(items.length, Math.floor((elapsed / mode.limitMs) * items.length) + 1)

  function currentElapsed(): number {
    return s.elapsedMs + (runningSince ? Math.max(0, Date.now() - runningSince) : 0)
  }

  function pause() {
    if (paused) return
    window.clearTimeout(advanceTimer.current)
    setS((prev) => ({ ...prev, elapsedMs: currentElapsed() }))
    setRunningSince(null)
    setGridOpen(false)
  }

  function resume() {
    setConfirmDiscard(false)
    setNow(Date.now())
    setRunningSince(Date.now())
  }

  function finish(timeUp: boolean) {
    if (finished.current) return
    finished.current = true
    window.clearTimeout(advanceTimer.current)
    onFinish(s.answers, timeUp ? mode.limitMs : Math.min(mode.limitMs, currentElapsed()), timeUp)
  }

  // 時計を進める
  useEffect(() => {
    if (runningSince === null) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [runningSince])

  // 時間切れで自動的に採点する
  useEffect(() => {
    if (remaining <= 0) finish(true)
  })

  // アプリを閉じても続きから再開できるように、変わるたびに保存する（一時停止中の値として）
  useEffect(() => {
    if (finished.current) return
    saveSession({ ...s, elapsedMs: elapsed })
  }, [s, Math.floor(elapsed / 5000)]) // eslint-disable-line react-hooks/exhaustive-deps

  // 画面を消したり別のアプリに切り替えたりしたら止める（通勤中の乗り換えなど）
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') pause()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  })

  // 戻るボタンは一覧を閉じるか、一時停止にする（うっかり模試が終わらないように）
  useBackHandler(true, () => {
    if (gridOpen) setGridOpen(false)
    else pause()
  })

  useEffect(() => () => window.clearTimeout(advanceTimer.current), [])

  const index = s.index
  const item = items[index]
  if (!item) return null
  const { question, choices } = item
  const selected = s.answers[index] ?? null
  const isLast = index === items.length - 1
  const categoryLabel = CATEGORIES.find((c) => c.id === question.category)?.label ?? ''

  function go(i: number) {
    window.clearTimeout(advanceTimer.current)
    setS((prev) => ({ ...prev, index: Math.max(0, Math.min(items.length - 1, i)) }))
    window.scrollTo({ top: 0 })
  }

  function choose(c: number) {
    if (paused) return
    setS((prev) => ({ ...prev, answers: prev.answers.map((a, i) => (i === index ? c : a)) }))
    if (isLast) return
    window.clearTimeout(advanceTimer.current)
    advanceTimer.current = window.setTimeout(() => go(index + 1), ADVANCE_MS)
  }

  function toggleFlag() {
    setS((prev) => ({ ...prev, flags: prev.flags.map((f, i) => (i === index ? !f : f)) }))
  }

  const timePct = Math.max(0, Math.min(100, (remaining / mode.limitMs) * 100))
  const behind = index + 1 < paceIndex - 1

  return (
    <div className="screen quiz mock">
      <header className="quiz-head">
        <button className="back" onClick={pause} aria-label="一時停止">
          ❚❚
        </button>
        <div className="quiz-head-main">
          <span className="quiz-title">{mode.label}</span>
          <span className="quiz-count">
            {index + 1} / {items.length}
          </span>
        </div>
      </header>

      <div className="mock-timer">
        <p className={`mock-clock${remaining < 60_000 ? ' danger' : remaining < mode.limitMs * 0.2 ? ' low' : ''}`}>
          残り <strong>{clock(remaining)}</strong>
        </p>
        <p className="mock-pace">
          解答 {answeredCount}/{items.length}・<span className={behind ? 'behind' : ''}>目安は{paceIndex}問目</span>
        </p>
        <div className="mock-timebar" aria-hidden="true">
          <div style={{ width: `${timePct}%` }} />
        </div>
      </div>

      <div className="q-meta">
        <span className="chip">{categoryLabel}</span>
        {s.flags[index] && <span className="chip chip-flag">★ 見直し</span>}
      </div>

      <p className="q-text">{question.text}</p>

      <ul className="choices">
        {choices.map((c, i) => (
          <li key={i}>
            <button
              className={`choice${selected === i ? ' choice-selected' : ''}`}
              aria-pressed={selected === i}
              onClick={() => choose(i)}
            >
              <span className="choice-mark">{String.fromCharCode(65 + i)}</span>
              <span className="choice-text">{c.text}</span>
            </button>
          </li>
        ))}
      </ul>

      <nav className="mock-nav">
        <button className="btn" onClick={() => go(index - 1)} disabled={index === 0}>
          ← 前へ
        </button>
        <button className={`btn mock-flag${s.flags[index] ? ' on' : ''}`} aria-pressed={s.flags[index]} onClick={toggleFlag}>
          {s.flags[index] ? '★ 見直し' : '☆ 見直し'}
        </button>
        {isLast ? (
          <button className="btn btn-primary" onClick={() => setGridOpen(true)}>
            採点へ
          </button>
        ) : (
          <button className="btn" onClick={() => go(index + 1)}>
            {selected === null ? 'パス →' : '次へ →'}
          </button>
        )}
      </nav>

      <button className="link-plain mock-grid-open" onClick={() => setGridOpen(true)}>
        問題一覧・採点（未解答 {unanswered}問{flagged > 0 ? `・見直し ${flagged}問` : ''}）
      </button>

      {gridOpen && <div className="mock-backdrop" onClick={() => setGridOpen(false)} aria-hidden="true" />}
      {gridOpen && (
        <div className="mock-sheet" role="dialog" aria-label="問題一覧">
          <div className="sheet-head">
            <span className="sheet-title">問題一覧</span>
            <button className="sheet-close" onClick={() => setGridOpen(false)} aria-label="閉じる">
              ✕
            </button>
          </div>
          <p className="mock-legend">
            <span className="cell-demo answered" />解答済み
            <span className="cell-demo" />未解答
            <span className="cell-demo flagged" />見直し
          </p>
          <ol className="mock-grid">
            {items.map((_, i) => (
              <li key={i}>
                <button
                  className={`mock-cell${s.answers[i] !== null ? ' answered' : ''}${s.flags[i] ? ' flagged' : ''}${i === index ? ' current' : ''}`}
                  onClick={() => {
                    setGridOpen(false)
                    go(i)
                  }}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
          <button className="btn btn-primary mock-finish" onClick={() => finish(false)}>
            採点して終了{unanswered > 0 ? `（未解答 ${unanswered}問は不正解）` : ''}
          </button>
        </div>
      )}

      {paused && (
        <div className="mock-paused" role="dialog" aria-label="一時停止中">
          <p className="mock-paused-title">一時停止中</p>
          <p className="mock-paused-sub">
            残り {clock(remaining)} ／ 解答 {answeredCount}/{items.length}
          </p>
          <p className="mock-paused-note">止めている間は時間が進みません。アプリを閉じても、ホームから続きを再開できます。</p>
          <div className="actions">
            <button className="btn btn-primary" onClick={resume}>
              再開する
            </button>
            <button className="btn" onClick={() => finish(false)}>
              ここで採点する{unanswered > 0 ? `（未解答 ${unanswered}問は不正解）` : ''}
            </button>
            <button
              className="btn"
              onClick={() => {
                saveSession({ ...s, elapsedMs: elapsed })
                onLeave()
              }}
            >
              ホームに戻る（続きはあとで）
            </button>
            {confirmDiscard ? (
              <button className="btn btn-danger" onClick={onDiscard}>
                本当にやめる（この模試は記録しない）
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => setConfirmDiscard(true)}>
                採点せずにやめる
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
