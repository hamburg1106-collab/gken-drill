import { useState } from 'react'
import { CATEGORIES } from '../data'
import { loadChecked, toggleChecked } from '../lib/checked'
import { activeQuestions } from '../lib/excluded'
import { QuestionCard } from './QuestionCard'

type Props = {
  onBack: () => void
}

export function CheckList({ onBack }: Props) {
  // 出題しない問題は確認する必要もないので並べない
  const NEEDS_CHECK = activeQuestions().filter((q) => q.needsCheck)
  const [checked, setChecked] = useState(() => loadChecked())
  const [hideDone, setHideDone] = useState(false)
  const done = NEEDS_CHECK.filter((q) => checked.has(q.id)).length

  return (
    <div className="screen checks">
      <header className="sub-head">
        <button className="back" onClick={onBack} aria-label="ホームに戻る">
          ←
        </button>
        <h1>要確認の問題</h1>
      </header>
      <p className="lede">
        年号・数値・人名・法令などを含み、公式テキストとの照合をおすすめする問題です。問題をタップすると正解と解説が開きます。テキストと合っていたら「確認済み」にチェックしてください。
      </p>

      <div className="check-progress">
        <span>
          確認済み <strong>{done}</strong> / {NEEDS_CHECK.length}問
        </span>
        <label className="check-filter">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          確認済みを隠す
        </label>
      </div>
      <div className="bar" aria-hidden="true">
        <div className="bar-correct" style={{ width: `${(done / NEEDS_CHECK.length) * 100}%` }} />
      </div>

      {CATEGORIES.map((c) => {
        const qs = NEEDS_CHECK.filter((q) => q.category === c.id && !(hideDone && checked.has(q.id)))
        if (qs.length === 0) return null
        return (
          <section key={c.id} className="check-section">
            <h2>{c.label}</h2>
            <ul className="qcards">
              {qs.map((q) => {
                const isDone = checked.has(q.id)
                return (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    className={isDone ? 'qcard-ok' : 'qcard-check'}
                    meta={<span className="chip chip-check">⚠ 要確認</span>}
                    aside={
                      <label className={`check-toggle${isDone ? ' on' : ''}`}>
                        <input type="checkbox" checked={isDone} onChange={() => setChecked((s) => toggleChecked(s, q.id))} />
                        確認済み
                      </label>
                    }
                  />
                )
              })}
            </ul>
          </section>
        )
      })}

      {hideDone && done === NEEDS_CHECK.length && <p className="all-correct">すべて確認済みです。</p>}

      <p className="note">確認済みのチェックはこの端末のブラウザ内にだけ保存され、学習記録をリセットしても消えません。</p>
    </div>
  )
}
