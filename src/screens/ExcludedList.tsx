import { excludedQuestions } from '../lib/excluded'
import { QuestionCard } from './QuestionCard'

type Props = {
  onRestore: (id: string) => void
  onBack: () => void
}

export function ExcludedList({ onRestore, onBack }: Props) {
  const questions = excludedQuestions()

  return (
    <div className="screen checks">
      <header className="sub-head">
        <button className="back" onClick={onBack} aria-label="ホームに戻る">
          ←
        </button>
        <h1>出題しない問題</h1>
      </header>
      <p className="lede">
        「テキストにない」として外した問題です。出題・復習・苦手問題には出ず、問題数や到達度にも数えません。「出題に戻す」で元に戻せます。
      </p>

      {questions.length === 0 ? (
        <p className="all-correct">ありません。問題の解説欄の一番下にある「🚫 テキストにない問題」を押すと、ここに入ります。</p>
      ) : (
        <ul className="qcards">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              aside={
                <button className="restore" onClick={() => onRestore(q.id)}>
                  出題に戻す
                </button>
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
