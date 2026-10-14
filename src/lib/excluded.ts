import type { Question } from '../data'
import { ALL_QUESTIONS } from '../data'

// 本人が「テキストにない」と判断して出題から外した問題。
// 出題・復習・苦手問題・要確認の一覧・到達度の分母のすべてから除く。学習記録のリセットでは消さない。

const KEY = 'gken-drill/excluded/v1'

let cache: Set<string> | null = null

function load(): Set<string> {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cache = new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [])
  } catch {
    cache = new Set()
  }
  return cache
}

export function isExcluded(id: string): boolean {
  return load().has(id)
}

export function setExcluded(id: string, on: boolean): void {
  const next = new Set(load())
  if (on) next.add(id)
  else next.delete(id)
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    // 保存できなくても、この画面を開いている間は外したままにする
  }
}

/** 出題の対象になっている問題（出題しない問題を除く） */
export function activeQuestions(): Question[] {
  const ex = load()
  return ex.size === 0 ? ALL_QUESTIONS : ALL_QUESTIONS.filter((q) => !ex.has(q.id))
}

/** 出題しない問題（問題の並び順のまま） */
export function excludedQuestions(): Question[] {
  const ex = load()
  return ALL_QUESTIONS.filter((q) => ex.has(q.id))
}
