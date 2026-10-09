import { ALL_QUESTIONS, CATEGORIES } from '../data'
import type { Accuracy, Progress } from './storage'
import { accuracyOf } from './storage'

const KEY = 'gken-drill/log/v1'

/** 前の解答からこの時間以内なら「続けて解いていた」とみなして勉強時間に足す */
const CONTINUE_MS = 5 * 60 * 1000
/** 間が空いたあとの1問目は、1問ぶんの目安としてこの時間を足す */
const FIRST_ANSWER_MS = 30 * 1000

export type Day = {
  /** 端末の時刻での日付（YYYY-MM-DD） */
  date: string
  /** その日に解答した回数 */
  answers: number
  /** その日に正解した回数 */
  correct: number
  /** 勉強時間の目安（ミリ秒）。解答の間隔から推定する */
  studyMs: number
  /** その日最後の解答の時刻 */
  lastAt: number
  /** その日最後の解答時点の、全問題に対する到達度 */
  reach: Accuracy
  /** 同じく分野別の到達度 */
  reachByCategory: Record<string, Accuracy>
}

/** 日付の昇順 */
export type StudyLog = Day[]

export function dateKey(time: number): string {
  const d = new Date(time)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function loadLog(): StudyLog {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StudyLog) : []
  } catch {
    return []
  }
}

function saveLog(log: StudyLog): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(log))
  } catch {
    // 保存できなくても解答は継続させる
  }
}

/** 1問解答するたびに呼ぶ。progress は今回の解答を反映した後のもの */
export function recordStudy(log: StudyLog, correct: boolean, progress: Progress, now = Date.now()): StudyLog {
  const date = dateKey(now)
  const last = log[log.length - 1]
  // 日付をまたいで続けて解いた場合も、間隔は前日の最後の解答から測る
  const gap = last ? now - last.lastAt : Infinity
  const addMs = gap >= 0 && gap <= CONTINUE_MS ? gap : FIRST_ANSWER_MS

  const today = last?.date === date ? last : null
  const day: Day = {
    date,
    answers: (today?.answers ?? 0) + 1,
    correct: (today?.correct ?? 0) + (correct ? 1 : 0),
    studyMs: (today?.studyMs ?? 0) + addMs,
    lastAt: now,
    ...reachOf(progress),
  }
  const next = today ? [...log.slice(0, -1), day] : [...log, day]
  saveLog(next)
  return next
}

function reachOf(progress: Progress): Pick<Day, 'reach' | 'reachByCategory'> {
  const reach = accuracyOf(
    progress,
    ALL_QUESTIONS.map((q) => q.id),
  )
  const reachByCategory: Record<string, Accuracy> = {}
  for (const c of CATEGORIES) {
    reachByCategory[c.id] = accuracyOf(
      progress,
      ALL_QUESTIONS.filter((q) => q.category === c.id).map((q) => q.id),
    )
  }
  return { reach, reachByCategory }
}

/** 「自信なし」の付け外しなど、解答数は変えずに到達度だけ変わったときに今日の行を更新する */
export function refreshReach(log: StudyLog, progress: Progress, now = Date.now()): StudyLog {
  const today = todayOf(log, now)
  if (!today) return log
  const next = [...log.slice(0, -1), { ...today, ...reachOf(progress) }]
  saveLog(next)
  return next
}

/** 自信を持って正解している問題数（v1の記録は自信なしの情報が無いので、全部を自信ありとみなす） */
export function sureOf(acc: Accuracy): number {
  return acc.correct - (acc.unsure ?? 0)
}

export function todayOf(log: StudyLog, now = Date.now()): Day | null {
  const last = log[log.length - 1]
  return last?.date === dateKey(now) ? last : null
}

/** 「1時間5分」のような表記。1分未満は「1分未満」 */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 1) return '1分未満'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}分`
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}

/** 10/07 のような短い日付 */
export function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${m}/${d}`
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 100)
}

/** draft/gken-doc/記録.md の表にそのまま貼れる行 */
export function toMarkdown(log: StudyLog): string {
  const total = ALL_QUESTIONS.length
  return log
    .map(
      (d) =>
        `| ${shortDate(d.date)} | ${formatDuration(d.studyMs)} | ${pct(d.correct, d.answers)}%（到達度 ${pct(d.reach.correct, total)}%${d.reach.unsure ? `・自信なし ${d.reach.unsure}問` : ''}） | ${d.answers} |  |  |`,
    )
    .join('\n')
}

export function toCsv(log: StudyLog): string {
  const total = ALL_QUESTIONS.length
  const head = [
    '日付',
    '勉強時間(分)',
    '解いた数',
    '正解数',
    'その日の正解率(%)',
    '到達度(%)',
    '自信ありの到達度(%)',
    '直近正解の問題数',
    'うち自信なしの問題数',
    '解答済みの問題数',
    ...CATEGORIES.map((c) => `${c.label} 到達度(%)`),
  ]
  const rows = log.map((d) => [
    d.date,
    Math.round(d.studyMs / 60000),
    d.answers,
    d.correct,
    pct(d.correct, d.answers),
    pct(d.reach.correct, total),
    pct(sureOf(d.reach), total),
    d.reach.correct,
    d.reach.unsure ?? 0,
    d.reach.answered,
    ...CATEGORIES.map((c) => {
      const acc = d.reachByCategory[c.id]
      const size = ALL_QUESTIONS.filter((q) => q.category === c.id).length
      return acc ? pct(acc.correct, size) : ''
    }),
  ])
  return [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n')
}
