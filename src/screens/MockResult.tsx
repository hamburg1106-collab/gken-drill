import { CATEGORIES } from '../data'
import type { MockResult as Result } from '../lib/mock'
import { MOCK_MODES, PASS_GUIDE } from '../lib/mock'
import type { QuizItem } from '../lib/quiz'
import { formatDuration, shortDate, dateKey } from '../lib/studyLog'
import { QuestionCard } from './QuestionCard'

type Props = {
  result: Result
  items: QuizItem[]
  answers: (number | null)[]
  /** 同じ形式のこれまでの結果（今回を含む、古い順） */
  history: Result[]
  onRetry: (ids: string[]) => void
  onAgain: () => void
  onHome: () => void
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100)
}

export function MockResult({ result, items, answers, history, onRetry, onAgain, onHome }: Props) {
  const mode = MOCK_MODES[result.mode]
  const rate = pct(result.correct, result.total)
  const prev = history.length >= 2 ? history[history.length - 2] : undefined
  const diff = prev ? rate - pct(prev.correct, prev.total) : null
  const passed = result.correct / Math.max(1, result.total) >= PASS_GUIDE
  const missed = items
    .map((it, i) => ({ it, a: answers[i] ?? null }))
    .filter(({ it, a }) => a === null || a !== it.answerIndex)

  return (
    <div className="screen result mock-result">
      <p className="result-title">{mode.label}の結果</p>

      <div className="score">
        <span className="score-main">
          {result.correct} <span className="score-slash">/</span> {result.total}
        </span>
        <span className="score-pct">
          正答率 {rate}%
          {diff !== null && (
            <span className={diff >= 0 ? 'up' : 'down'}>
              （前回より {diff >= 0 ? '+' : ''}
              {diff}ポイント）
            </span>
          )}
        </span>
      </div>

      <div className="mock-guide">
        <div className="mock-guide-bar" aria-hidden="true">
          <div className={passed ? 'ok' : ''} style={{ width: `${rate}%` }} />
          <span className="mock-guide-line" style={{ left: `${PASS_GUIDE * 100}%` }} />
        </div>
        <p className="mock-guide-note">
          {passed ? '目安の7割を超えています。' : `目安の7割まで、あと${Math.ceil(result.total * PASS_GUIDE) - result.correct}問。`}
          合格基準は公表されていないため、7割は一般に言われる目安です。
        </p>
      </div>

      <dl className="mock-stats">
        <div>
          <dt>使った時間</dt>
          <dd>
            {result.timeUp ? '時間切れ' : formatDuration(result.usedMs)} ／ {formatDuration(result.limitMs)}
          </dd>
        </div>
        <div>
          <dt>1問あたり</dt>
          <dd>
            {result.answered === 0 ? '—' : `${Math.round(result.usedMs / 1000 / result.answered)}秒`}（本番の目安は約41秒）
          </dd>
        </div>
        <div>
          <dt>未解答</dt>
          <dd>{result.total - result.answered}問</dd>
        </div>
      </dl>

      <section className="mock-cats">
        <h2>分野別の正答率</h2>
        <ul>
          {CATEGORIES.map((c) => {
            const sc = result.byCategory[c.id]
            if (!sc) return null
            const p = pct(sc.correct, sc.n)
            return (
              <li key={c.id}>
                <span className="mock-cat-label">{c.label}</span>
                <span className="mock-cat-num">
                  {sc.correct}/{sc.n}（{p}%）
                </span>
                <div className="mock-cat-bar" aria-hidden="true">
                  <div className={p >= PASS_GUIDE * 100 ? 'ok' : ''} style={{ width: `${p}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {missed.length > 0 && (
        <section className="mock-missed">
          <h2>間違えた・未解答の問題（{missed.length}問）</h2>
          <p className="mock-missed-sub">タップすると正解と解説が開きます。</p>
          <ul className="qcards">
            {missed.map(({ it, a }) => (
              <QuestionCard
                key={it.question.id}
                question={it.question}
                meta={
                  <span className="qcard-count">
                    {a === null ? '未解答' : `あなたの解答：${it.choices[a]?.text ?? ''}`}
                  </span>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {history.length >= 2 && (
        <section className="mock-history">
          <h2>{mode.label}のこれまで</h2>
          <ol>
            {history
              .slice(-5)
              .reverse()
              .map((h) => (
                <li key={h.at}>
                  <span>{shortDate(dateKey(h.at))}</span>
                  <span>
                    {h.correct}/{h.total}（{pct(h.correct, h.total)}%）
                  </span>
                  <span>{h.timeUp ? '時間切れ' : formatDuration(h.usedMs)}</span>
                </li>
              ))}
          </ol>
        </section>
      )}

      <div className="actions">
        {missed.length > 0 && (
          <button className="btn btn-primary" onClick={() => onRetry(missed.map(({ it }) => it.question.id))}>
            この{missed.length}問をやり直す（解説つき）
          </button>
        )}
        <button className="btn" onClick={onAgain}>
          もう一度{mode.label}
        </button>
        <button className="btn btn-ghost" onClick={onHome}>
          ホームに戻る
        </button>
      </div>
    </div>
  )
}
