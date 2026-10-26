import { useEffect, useRef, useState } from 'react'
import { ALL_QUESTIONS } from './data'
import { isExcluded, setExcluded } from './lib/excluded'
import { TERM_MAPS } from './data/maps'
import { figureOf } from './figures'
import { listenBack, setGuard } from './lib/backButton'
import type { QuizItem } from './lib/quiz'
import { SET_SIZE, buildSet, buildSetFromIds } from './lib/quiz'
import type { Source } from './lib/source'
import { labelOf, poolOf } from './lib/source'
import type { Progress } from './lib/storage'
import { loadProgress, markUnsure, recordAnswer, resetProgress, reviewIds, weakIds } from './lib/storage'
import type { StudyLog } from './lib/studyLog'
import { loadLog, recordMockStudy, recordStudy, refreshReach } from './lib/studyLog'
import type { MockModeId, MockResult as MockResultData, MockSession } from './lib/mock'
import {
  addMockResult,
  clearSession,
  loadSession,
  newSession,
  restoreSession,
  saveSession,
  scoreMock,
} from './lib/mock'
import { relationQuestions } from './lib/relationQuiz'
import { Mock } from './screens/Mock'
import { MockResult } from './screens/MockResult'
import { CheckList } from './screens/CheckList'
import { ExcludedList } from './screens/ExcludedList'
import { FigureList } from './screens/FigureList'
import { FigureView } from './screens/FigureView'
import { Home } from './screens/Home'
import { MapList } from './screens/MapList'
import { Quiz } from './screens/Quiz'
import { Result } from './screens/Result'
import { StudyLogView } from './screens/StudyLogView'
import { TermMapView } from './screens/TermMapView'
import { WeakList } from './screens/WeakList'

type View =
  | { kind: 'home' }
  | { kind: 'log' }
  | { kind: 'weak' }
  | { kind: 'checks' }
  | { kind: 'excluded' }
  | { kind: 'maps' }
  | { kind: 'map'; id: string }
  | { kind: 'figs' }
  | { kind: 'fig'; id: string }
  | { kind: 'quiz'; source: Source; title: string; items: QuizItem[]; seq: number }
  | { kind: 'result'; source: Source; title: string; items: QuizItem[]; results: boolean[]; unsure: boolean[] }
  | { kind: 'mock'; session: MockSession; items: QuizItem[]; resumed: boolean; seq: number }
  | {
      kind: 'mockResult'
      result: MockResultData
      items: QuizItem[]
      answers: (number | null)[]
      history: MockResultData[]
    }

export function App() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [log, setLog] = useState<StudyLog>(() => loadLog())
  const [view, setView] = useState<View>({ kind: 'home' })
  const [seq, setSeq] = useState(0)
  // 出題しない問題は lib/excluded が持つので、切り替えたら描き直すためだけの番号
  const [, setExcludedVersion] = useState(0)
  // 用語マップから問題に入ったとき、解き終えたらその図に戻れるようにする
  const [lastMapId, setLastMapId] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0 })
    setGuard(view.kind !== 'home')
  }, [view])

  /** 出題・結果画面から抜けるときの戻り先 */
  function leave(source: Source) {
    if (source.kind === 'term' && lastMapId) setView({ kind: 'map', id: lastMapId })
    else if (source.kind === 'figure') setView({ kind: 'fig', id: source.figureId })
    else if (source.kind === 'weak') setView({ kind: 'weak' })
    else if (source.kind === 'relation' && source.mapId) setView({ kind: 'map', id: source.mapId })
    else setView({ kind: 'home' })
  }

  // 戻るボタンで1つ上の画面へ。リスナーは1度だけ登録し、最新の状態は ref 経由で読む
  const backRef = useRef<() => void>(() => {})
  useEffect(() => {
    backRef.current = () => {
      switch (view.kind) {
        case 'maps':
        case 'figs':
        case 'log':
        case 'weak':
        case 'checks':
        case 'excluded':
        case 'mockResult':
          setView({ kind: 'home' })
          break
        case 'mock':
          // 模試の画面は自分で戻るボタンを受け取って一時停止にする
          break
        case 'map':
          setView({ kind: 'maps' })
          break
        case 'fig':
          setView({ kind: 'figs' })
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
        ? buildSetFromIds(pool, reviewIds(progress))
        : source.kind === 'weak'
          ? buildSetFromIds(pool, weakIds(progress).slice(0, SET_SIZE))
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
    const pool = source.kind === 'relation' ? relationQuestions() : ALL_QUESTIONS.filter((q) => !isExcluded(q.id))
    const items = buildSetFromIds(pool, ids, ids.length)
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

  function handleUnsure(id: string, unsure: boolean) {
    const next = markUnsure(progress, id, unsure)
    setProgress(next)
    setLog(refreshReach(log, next))
  }

  /** 出題対象が変わると到達度の分母も変わるので、今日の記録も更新する */
  function handleExclude(id: string, excluded: boolean) {
    setExcluded(id, excluded)
    setExcludedVersion((v) => v + 1)
    setLog(refreshReach(log, progress))
  }

  function startMock(mode: MockModeId) {
    const { session, items } = newSession(mode)
    saveSession(session)
    const next = seq + 1
    setSeq(next)
    setView({ kind: 'mock', session, items, resumed: false, seq: next })
  }

  function resumeMock() {
    const saved = loadSession()
    if (!saved) return
    const { session, items } = restoreSession(saved)
    if (items.length === 0) {
      clearSession()
      setView({ kind: 'home' })
      return
    }
    const next = seq + 1
    setSeq(next)
    setView({ kind: 'mock', session, items, resumed: true, seq: next })
  }

  /** 模試の採点。解答した問題は正誤の記録と学習の記録にも反映する */
  function finishMock(session: MockSession, items: QuizItem[], answers: (number | null)[], usedMs: number, timeUp: boolean) {
    const result = scoreMock(session.mode, items, answers, usedMs, timeUp)
    let next = progress
    items.forEach((it, i) => {
      const a = answers[i]
      if (a !== null && a !== undefined) next = recordAnswer(next, it.question.id, a === it.answerIndex)
    })
    setProgress(next)
    setLog(recordMockStudy(log, result.answered, result.correct, usedMs, next))
    const history = addMockResult(result).filter((h) => h.mode === session.mode)
    clearSession()
    setView({ kind: 'mockResult', result, items, answers, history })
  }

  if (view.kind === 'mock') {
    return (
      <Mock
        key={view.seq}
        initial={view.session}
        items={view.items}
        resumed={view.resumed}
        onFinish={(answers, usedMs, timeUp) => finishMock(view.session, view.items, answers, usedMs, timeUp)}
        onDiscard={() => {
          clearSession()
          setView({ kind: 'home' })
        }}
        onLeave={() => setView({ kind: 'home' })}
      />
    )
  }

  if (view.kind === 'mockResult') {
    return (
      <MockResult
        result={view.result}
        items={view.items}
        answers={view.answers}
        history={view.history}
        onRetry={(ids) => retry(ids, { kind: 'all' })}
        onAgain={() => startMock(view.result.mode)}
        onHome={() => setView({ kind: 'home' })}
      />
    )
  }

  if (view.kind === 'quiz') {
    return (
      <Quiz
        key={view.seq}
        title={view.title}
        items={view.items}
        onAnswer={handleAnswer}
        onUnsure={handleUnsure}
        onExclude={handleExclude}
        isExcluded={isExcluded}
        onFinish={(results, unsure) =>
          setView({
            kind: 'result',
            source: view.source,
            title: view.title,
            items: view.items,
            results,
            unsure,
          })
        }
        onQuit={() => leave(view.source)}
      />
    )
  }

  if (view.kind === 'result') {
    const fromMap =
      (view.source.kind === 'term' && !!lastMapId) || (view.source.kind === 'relation' && !!view.source.mapId)
    const fromFig = view.source.kind === 'figure'
    // 苦手問題は毎回「上位10問」なので、次の10問へ進んでも同じ問題が出やすい。一覧に戻す
    const fromWeak = view.source.kind === 'weak'
    return (
      <Result
        title={view.title}
        items={view.items}
        results={view.results}
        unsure={view.unsure}
        onRetryWrong={(ids) => retry(ids, view.source)}
        onNextSet={
          // 関係性クイズは1枚の図でも十数問あるので、図から始めても次の10問へ進める
          (fromMap && view.source.kind !== 'relation') || fromFig || fromWeak
            ? undefined
            : () => start(view.source, view.items.map((it) => it.question.id))
        }
        onHome={() => leave(view.source)}
        homeLabel={fromMap ? '用語マップに戻る' : fromFig ? '図解に戻る' : fromWeak ? '苦手問題の一覧に戻る' : 'ホームに戻る'}
      />
    )
  }

  if (view.kind === 'log') {
    return <StudyLogView log={log} onBack={() => setView({ kind: 'home' })} />
  }

  if (view.kind === 'weak') {
    return <WeakList progress={progress} onStart={() => start({ kind: 'weak' })} onBack={() => setView({ kind: 'home' })} />
  }

  if (view.kind === 'excluded') {
    return <ExcludedList onRestore={(id) => handleExclude(id, false)} onBack={() => setView({ kind: 'home' })} />
  }

  if (view.kind === 'checks') {
    return <CheckList onBack={() => setView({ kind: 'home' })} />
  }

  if (view.kind === 'figs') {
    return <FigureList onOpen={(id) => setView({ kind: 'fig', id })} onBack={() => setView({ kind: 'home' })} />
  }

  if (view.kind === 'fig') {
    const figure = figureOf(view.id)
    if (figure) {
      return (
        <FigureView
          key={figure.id}
          figure={figure}
          onBack={() => setView({ kind: 'figs' })}
          backLabel="図解の一覧に戻る"
          onQuiz={() =>
            start({ kind: 'figure', figureId: figure.id, label: figure.title, ids: figure.questionIds })
          }
        />
      )
    }
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
          onRelationQuiz={() => start({ kind: 'relation', mapId: map.id, label: map.title })}
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
      onOpenFigures={() => setView({ kind: 'figs' })}
      onOpenWeak={() => setView({ kind: 'weak' })}
      onOpenChecks={() => setView({ kind: 'checks' })}
      onOpenExcluded={() => setView({ kind: 'excluded' })}
      onReset={() => setProgress(resetProgress())}
      pendingMock={loadSession()}
      onStartMock={startMock}
      onResumeMock={resumeMock}
    />
  )
}
