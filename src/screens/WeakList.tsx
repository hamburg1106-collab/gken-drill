import { ALL_QUESTIONS, CATEGORIES } from '../data'
import type { Progress } from '../lib/storage'
import { WEAK_MIN_WRONG, weakIds } from '../lib/storage'
import { QuestionCard } from './QuestionCard'

type Props = {
  progress: Progress
  onStart: () => void
  onBack: () => void
}

export function WeakList({ progress, onStart, onBack }: Props) {
  const ids = weakIds(progress)
  const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]))
  const questions = ids.map((id) => byId.get(id)).filter((q) => q !== undefined)
  const counts = CATEGORIES.map((c) => ({
    ...c,
    n: questions.filter((q) => q.category === c.id).length,
  }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n)

  return (
    <div className="screen weak">
      <header className="sub-head">
        <button className="back" onClick={onBack} aria-label="ホームに戻る">
          ←
        </button>
        <h1>苦手問題</h1>
      </header>
      <p className="lede">
        {WEAK_MIN_WRONG}回以上間違えた問題を、間違えた回数の多い順に並べています。一度正解しても一覧には残ります。問題をタップすると正解と解説が開きます。
      </p>

      {questions.length === 0 ? (
        <p className="all-correct">まだありません。{WEAK_MIN_WRONG}回以上間違えた問題がここに並びます。</p>
      ) : (
        <>
          <section className="weak-summary">
            <h2>分野ごとの苦手の数（テキストを読み直す目安）</h2>
            <ul>
              {counts.map((c) => (
                <li key={c.id}>
                  <span>{c.label}</span>
                  <strong>{c.n}問</strong>
                </li>
              ))}
            </ul>
          </section>

          <button className="btn btn-primary weak-start" onClick={onStart}>
            間違えた回数の多い{Math.min(10, questions.length)}問を解く
          </button>

          <ul className="qcards">
            {questions.map((q) => {
              const s = progress[q.id]!
              const state = s.lastWrong ? '間違えたまま' : s.lastUnsure ? '🤔 自信なし' : '直近は正解'
              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  className={s.lastWrong ? 'qcard-wrong' : s.lastUnsure ? 'qcard-unsure' : 'qcard-ok'}
                  meta={
                    <span className="qcard-count">
                      ✕{s.wrong}回 ○{s.correct}回 ／ {state}
                    </span>
                  }
                />
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
