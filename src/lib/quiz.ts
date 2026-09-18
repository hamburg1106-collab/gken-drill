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
 */
export function buildSet(pool: Question[], progress: Progress, size = SET_SIZE): QuizItem[] {
  const unseen = pool.filter((q) => {
    const s = progress[q.id]
    return !s || s.correct + s.wrong === 0
  })
  const seen = pool.filter((q) => {
    const s = progress[q.id]
    return !!s && s.correct + s.wrong > 0
  })
  const picked = [...shuffle(unseen), ...shuffle(seen)].slice(0, size)
  return shuffle(picked).map(toItem)
}

/** 指定したIDの問題だけでセットを作る（誤答のやり直し用） */
export function buildSetFromIds(pool: Question[], ids: string[], size = SET_SIZE): QuizItem[] {
  const set = new Set(ids)
  return shuffle(pool.filter((q) => set.has(q.id)))
    .slice(0, size)
    .map(toItem)
}
