import type { MapNode } from '../data/mapTypes'
import type { Question } from '../data/types'

export function keywordsOf(node: MapNode): string[] {
  return node.match ?? [node.label.replace(/\n/g, '')]
}

/**
 * 用語に関連する問題のID。問題文か選択肢の文言にキーワードが含まれるものを拾う。
 * 解説文まで見ると関連の薄い問題が大量に混ざるので、対象にしない。
 */
export function relatedQuestionIds(node: MapNode, questions: Question[]): string[] {
  const keywords = keywordsOf(node)
  if (keywords.length === 0) return []
  return questions
    .filter((q) =>
      keywords.some((k) => q.text.includes(k) || q.choices.some((c) => c.text.includes(k))),
    )
    .map((q) => q.id)
}
