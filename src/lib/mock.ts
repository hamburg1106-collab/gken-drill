import { CATEGORIES } from '../data'
import type { CategoryId, Question } from '../data'
import { activeQuestions } from './excluded'
import type { QuizItem } from './quiz'
import { shuffle, toItem } from './quiz'

// 模試モード。本番（オンライン試験：100分・約145問、1問あたり約41秒）と同じペースで解く。
// 解いている間は正誤も解説も出さず、最後にまとめて採点する。

export type MockModeId = 'full' | 'mini'

export type MockMode = {
  id: MockModeId
  label: string
  count: number
  limitMs: number
}

export const MOCK_MODES: Record<MockModeId, MockMode> = {
  full: { id: 'full', label: '本番形式の模試', count: 145, limitMs: 100 * 60 * 1000 },
  mini: { id: 'mini', label: 'ミニ模試', count: 35, limitMs: 25 * 60 * 1000 },
}

/** 合否の基準は公表されていないため、一般に言われる目安として表示だけに使う */
export const PASS_GUIDE = 0.7

/**
 * 出題の対象から count 問を選ぶ。分野の比率は出題対象の問題数の比率に合わせる
 * （最大剰余法で配分し、分野の中ではランダム）。並び順は全体でシャッフルする
 */
export function buildMock(count: number, pool: Question[] = activeQuestions()): QuizItem[] {
  const n = Math.min(count, pool.length)
  const groups = CATEGORIES.map((c) => ({ id: c.id, qs: shuffle(pool.filter((q) => q.category === c.id)) })).filter(
    (g) => g.qs.length > 0,
  )
  const quotas = groups.map((g) => {
    const exact = (g.qs.length / pool.length) * n
    return { g, take: Math.floor(exact), rest: exact - Math.floor(exact) }
  })
  let left = n - quotas.reduce((s, q) => s + q.take, 0)
  for (const q of [...quotas].sort((a, b) => b.rest - a.rest)) {
    if (left === 0) break
    if (q.take < q.g.qs.length) {
      q.take++
      left--
    }
  }
  const picked = quotas.flatMap((q) => q.g.qs.slice(0, q.take))
  return shuffle(picked).map((q) => toItem(q))
}

// ---------- 途中の状態（アプリを閉じても続きから再開できるように） ----------

const SESSION_KEY = 'gken-drill/mock-session/v1'

export type MockSession = {
  mode: MockModeId
  /** 出題順の問題ID */
  ids: string[]
  /** 各問題の選択肢の表示順（question.choices の添字） */
  orders: number[][]
  /** 各問題で選んだ表示上の選択肢の添字。未解答は null */
  answers: (number | null)[]
  /** 見直しの印 */
  flags: boolean[]
  index: number
  /** 一時停止までに経過した時間 */
  elapsedMs: number
  startedAt: number
}

export function newSession(mode: MockModeId): { session: MockSession; items: QuizItem[] } {
  const items = buildMock(MOCK_MODES[mode].count)
  const session: MockSession = {
    mode,
    ids: items.map((it) => it.question.id),
    orders: items.map((it) => it.choices.map((c) => it.question.choices.indexOf(c))),
    answers: items.map(() => null),
    flags: items.map(() => false),
    index: 0,
    elapsedMs: 0,
    startedAt: Date.now(),
  }
  return { session, items }
}

export function loadSession(): MockSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as MockSession
    if (!s || !Array.isArray(s.ids) || !(s.mode in MOCK_MODES)) return null
    return s
  } catch {
    return null
  }
}

export function saveSession(session: MockSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // 保存できなくても、開いている間は続けられる
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // 消せなくても次の開始で上書きされる
  }
}

/** 保存した途中の状態から出題を復元する。削除・出題しないにした問題は外す */
export function restoreSession(s: MockSession): { session: MockSession; items: QuizItem[] } {
  const byId = new Map(activeQuestions().map((q) => [q.id, q]))
  const keep = s.ids.map((id, i) => ({ q: byId.get(id), i })).filter((x) => x.q !== undefined)
  const session: MockSession = {
    ...s,
    ids: keep.map((x) => s.ids[x.i]!),
    orders: keep.map((x) => s.orders[x.i] ?? []),
    answers: keep.map((x) => s.answers[x.i] ?? null),
    flags: keep.map((x) => s.flags[x.i] ?? false),
    index: Math.min(s.index, Math.max(0, keep.length - 1)),
  }
  const items = keep.map((x, j) => toItem(x.q!, session.orders[j]))
  return { session, items }
}

// ---------- 結果の履歴 ----------

const HISTORY_KEY = 'gken-drill/mock/v1'

export type CategoryScore = { n: number; correct: number }

export type MockResult = {
  mode: MockModeId
  /** 終了した時刻 */
  at: number
  total: number
  answered: number
  correct: number
  usedMs: number
  limitMs: number
  /** 時間切れで終わったか */
  timeUp: boolean
  byCategory: Partial<Record<CategoryId, CategoryScore>>
}

export function loadMockHistory(): MockResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as MockResult[]) : []
  } catch {
    return []
  }
}

export function addMockResult(result: MockResult): MockResult[] {
  const next = [...loadMockHistory(), result]
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    // 保存できなくても結果画面は出す
  }
  return next
}

export function scoreMock(
  mode: MockModeId,
  items: QuizItem[],
  answers: (number | null)[],
  usedMs: number,
  timeUp: boolean,
): MockResult {
  const byCategory: Partial<Record<CategoryId, CategoryScore>> = {}
  let correct = 0
  let answered = 0
  items.forEach((it, i) => {
    const a = answers[i]
    const ok = a !== null && a !== undefined && a === it.answerIndex
    if (a !== null && a !== undefined) answered++
    if (ok) correct++
    const c = (byCategory[it.question.category] ??= { n: 0, correct: 0 })
    c.n++
    if (ok) c.correct++
  })
  return {
    mode,
    at: Date.now(),
    total: items.length,
    answered,
    correct,
    usedMs,
    limitMs: MOCK_MODES[mode].limitMs,
    timeUp,
    byCategory,
  }
}

/** 「12:05」のような残り時間の表記（切り上げ） */
export function clock(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
