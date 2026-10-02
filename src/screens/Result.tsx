import type { QuizItem } from '../lib/quiz'

type Props = {
  title: string
  items: QuizItem[]
  results: boolean[]
  onRetryWrong: (ids: string[]) => void
  /** 省略すると「次の10問へ」を出さない（用語マップから来た場合は問題が数問しかないため） */
  onNextSet?: () => void
  onHome: () => void
  homeLabel?: string
}

export function Result({ title, items, results, onRetryWrong, onNextSet, onHome, homeLabel = 'ホームに戻る' }: Props) {
  const correct = results.filter(Boolean).length
  const wrongItems = items.filter((_, i) => results[i] === false)
  const pct = results.length === 0 ? 0 : Math.round((correct / results.length) * 100)

  return (
    <div className="screen result">
      <p className="result-title">{title}</p>

      <div className="score">
        <span className="score-main">
          {correct} <span className="score-slash">/</span> {results.length}
        </span>
        <span className="score-pct">正解率 {pct}%</span>
      </div>

      {wrongItems.length > 0 ? (
        <section className="wrong-list">
          <h2>間違えた問題（{wrongItems.length}問）</h2>
          <ul>
            {wrongItems.map((it) => (
              <li key={it.question.id}>
                <p className="wrong-q">{it.question.text}</p>
                <p className="wrong-a">正解：{it.question.choices[it.question.answer]?.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="all-correct">全問正解。</p>
      )}

      <div className="actions">
        {wrongItems.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={() => onRetryWrong(wrongItems.map((it) => it.question.id))}
          >
            この{wrongItems.length}問をやり直す
          </button>
        )}
        {onNextSet && (
          <button className="btn" onClick={onNextSet}>
            次の10問へ
          </button>
        )}
        <button className="btn btn-ghost" onClick={onHome}>
          {homeLabel}
        </button>
      </div>
    </div>
  )
}
