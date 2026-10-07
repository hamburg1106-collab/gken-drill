import { useEffect, useRef, useState } from 'react'
import { ALL_QUESTIONS } from './data'
import { TERM_MAPS } from './data/maps'
import { listenBack, setGuard } from './lib/backButton'
import type { QuizItem } from './lib/quiz'
import { SET_SIZE, buildSet, buildSetFromIds } from './lib/quiz'
import type { Source } from './lib/source'
import { labelOf, poolOf } from './lib/source'
import type { Progress } from './lib/storage'
import { loadProgress, recordAnswer, resetProgress, wrongIds } from './lib/storage'
import type { StudyLog } from './lib/studyLog'
import { loadLog, recordStudy } from './lib/studyLog'
import { Home } from './screens/Home'
import { MapList } from './screens/MapList'
import { Quiz } from './screens/Quiz'
import { Result } from './screens/Result'
import { StudyLogView } from './screens/StudyLogView'
import { TermMapView } from './screens/TermMapView'

type View =
  | { kind: 'home' }
  | { kind: 'log' }
  | { kind: 'maps' }
  | { kind: 'map'; id: string }
  | { kind: 'quiz'; source: Source; title: string; items: QuizItem[]; seq: number }
  | { kind: 'result'; source: Source; title: string; items: QuizItem[]; results: boolean[] }

export function App() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [log, setLog] = useState<StudyLog>(() => loadLog())
  const [view, setView] = useState<View>({ kind: 'home' })
  const [seq, setSeq] = useState(0)
  // 用語マップから問題に入ったとき、解き終えたらその図に戻れるようにする
  const [lastMapId, setLastMapId] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setGuard(view.kind !== 'home')
  }, [view])

  /** 出題・結果画面から抜けるときの戻り先 */
  function leave(source: Source) {
    if (source.kind === 'term' && lastMapId) setView({ kind: 'map', id: lastMapId })
    else setView({ kind: 'home' })
  }

  // 戻るボタンで1つ上の画面へ。リスナーは1度だけ登録し、最新の状態は ref 経由で読む
  const backRef = useRef<() => void>(() => {})
  useEffect(() => {
    backRef.current = () => {
      switch (view.kind) {
        case 'maps':
        case 'log':
          setView({ kind: 'home' })
          break
        case 'map':
          setView({ kind: 'maps' })
          break
        case 'quiz':
        case 'result':
          leave(view.source)
          break
        case 'home':
          break
      }
    }
  })
  useEffect(() => listenBack(() => backRef.current()), [])

  /** exclude には直前のセットで出した問題を渡し、続けて同じ問題が出るのを防ぐ */
  function start(source: Source, exclude: readonly string[] = []) {
    const pool = poolOf(source)
    const items =
      source.kind === 'wrong'
        ? buildSetFromIds(pool, wrongIds(progress))
        : buildSet(pool, progress, SET_SIZE, exclude)
    if (items.length === 0) {
      setView({ kind: 'home' })
      return
    }
    const next = seq + 1
    setSeq(next)
    setView({ kind: 'quiz', source, title: labelOf(source), items, seq: next })
  }

  /** 誤答のやり直し。source は引き継ぎ、この後の「次の10問へ」が元の出題元に戻るようにする */
  function retry(ids: string[], source: Source) {
    const items = buildSetFromIds(ALL_QUESTIONS, ids, ids.length)
    if (items.length === 0) {
      setView({ kind: 'home' })
      return
    }
    const next = seq + 1
    setSeq(next)
    setView({ kind: 'quiz', source, title: 'まちがい直し', items, seq: next })
  }

  // 1問ごとに画面が描き直されるので、ここでの progress と log は常に最新
  function handleAnswer(id: string, correct: boolean) {
    const next = recordAnswer(progress, id, correct)
    setProgress(next)
    setLog(recordStudy(log, correct, next))
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
        onQuit={() => leave(view.source)}
      />
    )
  }

  if (view.kind === 'result') {
    const fromMap = view.source.kind === 'term' && !!lastMapId
    return (
      <Result
        title={view.title}
        items={view.items}
        results={view.results}
        onRetryWrong={(ids) => retry(ids, view.source)}
        onNextSet={fromMap ? undefined : () => start(view.source, view.items.map((it) => it.question.id))}
        onHome={() => leave(view.source)}
        homeLabel={fromMap ? '用語マップに戻る' : 'ホームに戻る'}
      />
    )
  }

  if (view.kind === 'log') {
    return <StudyLogView log={log} onBack={() => setView({ kind: 'home' })} />
  }

  if (view.kind === 'maps') {
    return (
      <MapList
        onOpen={(id) => setView({ kind: 'map', id })}
        onBack={() => setView({ kind: 'home' })}
      />
    )
  }

  if (view.kind === 'map') {
    const map = TERM_MAPS.find((m) => m.id === view.id)
    if (map) {
      return (
        <TermMapView
          key={map.id}
          map={map}
          onBack={() => setView({ kind: 'maps' })}
          onQuiz={(label, ids) => {
            setLastMapId(map.id)
            start({ kind: 'term', label, ids })
          }}
        />
      )
    }
  }

  return (
    <Home
      progress={progress}
      log={log}
      onStart={(source) => start(source)}
      onOpenLog={() => setView({ kind: 'log' })}
      onOpenMaps={() => setView({ kind: 'maps' })}
      onReset={() => setProgress(resetProgress())}
    />
  )
}
