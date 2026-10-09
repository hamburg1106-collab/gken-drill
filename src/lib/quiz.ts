import type { Choice, Question } from '../data'
import type { Progress } from './storage'

export const SET_SIZE = 10

export type QuizItem = {
  question: Question
  /** 表示順にシャッフルした選択肢 */
  choices: Choice[]
  /** シャッフル後の正解の添字 */
  answerIndex: number
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function toItem(question: Question): QuizItem {
  const correct = question.choices[question.answer]
  const choices = shuffle(question.choices)
  return {
    question,
    choices,
    answerIndex: choices.findIndex((c) => c === correct),
  }
}

/**
 * 出題セットを作る。まだ解いていない問題を優先し、足りない分を既出から埋める。
 * 同じ問題ばかり繰り返さず、未到達の範囲から先に潰せるようにするため。
 *
 * exclude には直前のセットで出した問題を渡す。分野を一周して未出題が尽きると
 * 既出から埋めることになるが、そのとき直前に解いたばかりの問題が再び出るのを避ける。
 * 既出から埋める順番は、間違えたままの問題 → 自信なしの問題 → 解答回数の少ない問題を先にする。
 */
export function buildSet(
  pool: Question[],
  progress: Progress,
  size = SET_SIZE,
  exclude: readonly string[] = [],
): QuizItem[] {
  const skip = new Set(exclude)
  const remaining = pool.filter((q) => !skip.has(q.id))
  // 除外するとセットを埋められないほど小さいプールでは、除外自体を諦める
  const target = remaining.length >= size ? remaining : pool

  const timesAnswered = (id: string) => {
    const s = progress[id]
    return s ? s.correct + s.wrong : 0
  }

  const unseen = shuffle(target.filter((q) => timesAnswered(q.id) === 0))
  const priority = (id: string) => {
    const s = progress[id]
    if (s?.lastWrong) return 2
    if (s?.lastUnsure) return 1
    return 0
  }
  const seen = shuffle(target.filter((q) => timesAnswered(q.id) > 0)).sort((a, b) => {
    const diff = priority(b.id) - priority(a.id)
    if (diff !== 0) return diff
    return timesAnswered(a.id) - timesAnswered(b.id)
  })

  const picked = [...unseen, ...seen].slice(0, size)
  return shuffle(picked).map(toItem)
}

/** 指定したIDの問題だけでセットを作る（誤答のやり直し用） */
export function buildSetFromIds(pool: Question[], ids: string[], size = SET_SIZE): QuizItem[] {
  const set = new Set(ids)
  return shuffle(pool.filter((q) => set.has(q.id)))
    .slice(0, size)
    .map(toItem)
}
