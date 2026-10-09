import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '../data'
import type { QuizItem } from '../lib/quiz'

type Props = {
  title: string
  items: QuizItem[]
  onAnswer: (id: string, correct: boolean) => void
  /** 正解した問題に「勘だった（自信なし）」を付ける・外す */
  onUnsure: (id: string, unsure: boolean) => void
  /** unsure は results と同じ並びで、自信なしを付けたかどうか */
  onFinish: (results: boolean[], unsure: boolean[]) => void
  onQuit: () => void
}

export function Quiz({ title, items, onAnswer, onUnsure, onFinish, onQuit }: Props) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [unsure, setUnsure] = useState<boolean[]>([])
  const feedbackRef = useRef<HTMLDivElement>(null)

  // 選択肢が長いと解説が画面外に出るので、解答したら解説の先頭まで送る
  useEffect(() => {
    if (selected === null) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    feedbackRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  }, [selected])

  const item = items[index]
  if (!item) return null

  const { question, choices, answerIndex } = item
  const categoryLabel = CATEGORIES.find((c) => c.id === question.category)?.label ?? ''
  const answered = selected !== null
  const isLast = index === items.length - 1
  const isUnsure = unsure[index] ?? false

  function choose(i: number) {
    if (selected !== null) return
    setSelected(i)
    const correct = i === answerIndex
    setResults((prev) => [...prev, correct])
    setUnsure((prev) => [...prev, false])
    onAnswer(question.id, correct)
  }

  function toggleUnsure() {
    const flag = !isUnsure
    setUnsure((prev) => prev.map((v, i) => (i === index ? flag : v)))
    onUnsure(question.id, flag)
  }

  function next() {
    if (isLast) {
      onFinish(results, unsure)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="screen quiz">
      <header className="quiz-head">
        <button className="back" onClick={onQuit} aria-label="中断してホームに戻る">
          ✕
        </button>
        <div className="quiz-head-main">
          <span className="quiz-title">{title}</span>
          <span className="quiz-count">
            {index + 1} / {items.length}
          </span>
        </div>
      </header>

      <div className="dots" aria-hidden="true">
        {items.map((_, i) => (
          <span
            key={i}
            className={
              i < results.length
                ? results[i]
                  ? 'dot dot-correct'
                  : 'dot dot-wrong'
                : i === index
                  ? 'dot dot-current'
                  : 'dot'
            }
          />
        ))}
      </div>

      <div className="q-meta">
        <span className="chip">{categoryLabel}</span>
        {question.needsCheck && (
          <span className="chip chip-check" title="年号・数値・法令などを含む問題。公式テキストとの照合を推奨">
            ⚠ 要確認
          </span>
        )}
      </div>

      <p className="q-text">{question.text}</p>

      <ul className="choices">
        {choices.map((c, i) => {
          const state =
            !answered ? '' : i === answerIndex ? ' choice-correct' : i === selected ? ' choice-wrong' : ' choice-dim'
          return (
            <li key={i}>
              <button className={`choice${state}`} onClick={() => choose(i)} disabled={answered}>
                <span className="choice-mark">{answered && i === answerIndex ? '○' : answered && i === selected ? '✕' : String.fromCharCode(65 + i)}</span>
                <span className="choice-text">{c.text}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {answered && (
        <div ref={feedbackRef} className={`feedback ${selected === answerIndex ? 'ok' : 'ng'}`}>
          <p className="verdict">
            {selected === answerIndex ? '正解' : '不正解'}
            <span className="verdict-sub">正解は「{choices[answerIndex]?.text}」</span>
          </p>

          {selected === answerIndex && (
            <button
              className={`unsure-toggle${isUnsure ? ' on' : ''}`}
              aria-pressed={isUnsure}
              onClick={toggleUnsure}
            >
              {isUnsure ? '🤔 自信なし（復習に回します）・取り消す' : '🤔 勘だった（自信なし）'}
            </button>
          )}

          <p className="explain">{choices[answerIndex]?.note}</p>

          <div className="others">
            <h3>他の選択肢</h3>
            <ul>
              {choices.map((c, i) =>
                i === answerIndex ? null : (
                  <li key={i}>
                    <span className="other-text">{c.text}</span>
                    <span className="other-note">{c.note}</span>
                  </li>
                ),
              )}
            </ul>
          </div>

          <button className="next" onClick={next}>
            {isLast ? '結果を見る' : '次の問題へ'}
          </button>
        </div>
      )}
    </div>
  )
}
