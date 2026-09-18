import { useState } from 'react'
import { ALL_QUESTIONS } from './data'
import type { QuizItem } from './lib/quiz'
import { buildSet, buildSetFromIds } from './lib/quiz'
import type { Source } from './lib/source'
import { labelOf, poolOf } from './lib/source'
import type { Progress } from './lib/storage'
import { loadProgress, recordAnswer, resetProgress, wrongIds } from './lib/storage'
import { Home } from './screens/Home'
import { Quiz } from './screens/Quiz'
import { Result } from './screens/Result'

type View =
  | { kind: 'home' }
  | { kind: 'quiz'; source: Source; title: string; items: QuizItem[]; seq: number }
  | { kind: 'result'; source: Source; title: string; items: QuizItem[]; results: boolean[] }

export function App() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [view, setView] = useState<View>({ kind: 'home' })
  const [seq, setSeq] = useState(0)

  function start(source: Source, current: Progress = progress) {
    const pool = poolOf(source)
    const items =
      source.kind === 'wrong'
        ? buildSetFromIds(pool, wrongIds(current))
        : buildSet(pool, current)
    if (items.length === 0) {
      setView({ kind: 'home' })
      return
    }
    const next = seq + 1
    setSeq(next)
    setView({ kind: 'quiz', source, title: labelOf(source), items, seq: next })
  }

  function retry(ids: string[]) {
    const items = buildSetFromIds(ALL_QUESTIONS, ids, ids.length)
    if (items.length === 0) {
      setView({ kind: 'home' })
      return
    }
    const next = seq + 1
    setSeq(next)
    setView({ kind: 'quiz', source: { kind: 'wrong' }, title: 'まちがい直し', items, seq: next })
  }

  function handleAnswer(id: string, correct: boolean) {
    setProgress((prev) => recordAnswer(prev, id, correct))
  }

  if (view.kind === 'quiz') {
    return (
      <Quiz
        key={view.seq}
        title={view.title}
        items={view.items}
        onAnswer={handleAnswer}
        onFinish={(results) =>
          setView({
            kind: 'result',
            source: view.source,
            title: view.title,
            items: view.items,
            results,
          })
        }
        onQuit={() => setView({ kind: 'home' })}
      />
    )
  }

  if (view.kind === 'result') {
    return (
      <Result
        title={view.title}
        items={view.items}
        results={view.results}
        onRetryWrong={retry}
        onNextSet={() => start(view.source)}
        onHome={() => setView({ kind: 'home' })}
      />
    )
  }

  return (
    <Home
      progress={progress}
      onStart={(source) => start(source)}
      onReset={() => setProgress(resetProgress())}
    />
  )
}
