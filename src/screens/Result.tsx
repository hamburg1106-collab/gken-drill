import type { QuizItem } from '../lib/quiz'

type Props = {
  title: string
  items: QuizItem[]
  results: boolean[]
  /** results と同じ並びで、正解に「自信なし」を付けたかどうか */
  unsure: boolean[]
  /** 間違えた問題と自信なしの問題をまとめてやり直す */
  onRetryWrong: (ids: string[]) => void
  /** 省略すると「次の10問へ」を出さない（用語マップから来た場合は問題が数問しかないため） */
  onNextSet?: () => void
  onHome: () => void
  homeLabel?: string
}

function ReviewList({ heading, items }: { heading: string; items: QuizItem[] }) {
  return (
    <section className="wrong-list">
      <h2>{heading}</h2>
      <ul>
        {items.map((it) => (
          <li key={it.question.id}>
            <p className="wrong-q">{it.question.text}</p>
            <p className="wrong-a">正解：{it.question.choices[it.question.answer]?.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Result({
  title,
  items,
  results,
  unsure,
  onRetryWrong,
  onNextSet,
  onHome,
  homeLabel = 'ホームに戻る',
}: Props) {
  const correct = results.filter(Boolean).length
  const wrongItems = items.filter((_, i) => results[i] === false)
  const unsureItems = items.filter((_, i) => results[i] === true && unsure[i])
  const reviewItems = [...wrongItems, ...unsureItems]
  const pct = results.length === 0 ? 0 : Math.round((correct / results.length) * 100)

  return (
    <div className="screen result">
      <p className="result-title">{title}</p>

      <div className="score">
        <span className="score-main">
          {correct} <span className="score-slash">/</span> {results.length}
        </span>
        <span className="score-pct">
          正解率 {pct}%{unsureItems.length > 0 && `（うち自信なし ${unsureItems.length}問）`}
        </span>
      </div>

      {wrongItems.length > 0 && <ReviewList heading={`間違えた問題（${wrongItems.length}問）`} items={wrongItems} />}
      {unsureItems.length > 0 && (
        <ReviewList heading={`🤔 自信なしの問題（${unsureItems.length}問）`} items={unsureItems} />
      )}
      {reviewItems.length === 0 && <p className="all-correct">全問正解。</p>}

      <div className="actions">
        {reviewItems.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={() => onRetryWrong(reviewItems.map((it) => it.question.id))}
          >
            この{reviewItems.length}問をやり直す
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
