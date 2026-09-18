import { ALL_QUESTIONS, CATEGORIES } from '../data'
import type { CategoryId, Question } from '../data'

export type Source =
  | { kind: 'all' }
  | { kind: 'wrong' }
  | { kind: 'category'; id: CategoryId }

export function labelOf(source: Source): string {
  switch (source.kind) {
    case 'all':
      return '全分野ランダム'
    case 'wrong':
      return '間違えた問題'
    case 'category':
      return CATEGORIES.find((c) => c.id === source.id)?.label ?? '分野別'
  }
}

export function poolOf(source: Source): Question[] {
  switch (source.kind) {
    case 'all':
    case 'wrong':
      return ALL_QUESTIONS
    case 'category':
      return ALL_QUESTIONS.filter((q) => q.category === source.id)
  }
}
