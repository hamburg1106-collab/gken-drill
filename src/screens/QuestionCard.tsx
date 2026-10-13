import type { ReactNode } from 'react'
import type { Question } from '../data'
import { CATEGORIES } from '../data'
import { ANALOGIES } from '../data/analogies'

type Props = {
  question: Question
  /** 分野名の横に並べる小さな情報（間違えた回数など） */
  meta?: ReactNode
  /** カードの右上に置く操作（確認済みのチェックなど） */
  aside?: ReactNode
  className?: string
}

/** 一覧用の問題カード。タップすると正解と解説が開く */
export function QuestionCard({ question, meta, aside, className = '' }: Props) {
  const category = CATEGORIES.find((c) => c.id === question.category)?.label ?? ''
  const answer = question.choices[question.answer]
  const others = question.choices.filter((_, i) => i !== question.answer)
  const analogy = ANALOGIES[question.id]

  return (
    <li className={`qcard ${className}`}>
      <div className="qcard-head">
        <p className="qcard-meta">
          <span className="chip">{category}</span>
          {meta}
        </p>
        {aside}
      </div>
      <details>
        <summary className="qcard-q">{question.text}</summary>
        <div className="qcard-body">
          <p className="wrong-a">正解：{answer?.text}</p>
          <p className="qcard-note">{answer?.note}</p>
          {analogy && (
            <div className="analogy">
              <p className="analogy-head">💡 たとえると</p>
              <p className="analogy-body">{analogy}</p>
            </div>
          )}
          <ul className="qcard-others">
            {others.map((c) => (
              <li key={c.text}>
                <span className="other-text">{c.text}</span>
                <span className="other-note">{c.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </li>
  )
}
