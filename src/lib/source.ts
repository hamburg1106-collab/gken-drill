import { CATEGORIES } from '../data'
import type { CategoryId, Question } from '../data'
import { activeQuestions } from './excluded'
import { relationQuestions } from './relationQuiz'

export type Source =
  | { kind: 'all' }
  | { kind: 'wrong' }
  /** 苦手問題（何度も間違えた問題）の上位から解く */
  | { kind: 'weak' }
  | { kind: 'category'; id: CategoryId }
  /** 用語マップから、その用語に関連する問題だけを解く */
  | { kind: 'term'; label: string; ids: string[] }
  /** 動く図解から、その図に関係する問題だけを解く */
  | { kind: 'figure'; figureId: string; label: string; ids: string[] }
  /** 用語マップの線から作った関係性クイズ。mapId があればその図だけ */
  | { kind: 'relation'; mapId?: string; label?: string }

export function labelOf(source: Source): string {
  switch (source.kind) {
    case 'all':
      return '全分野ランダム'
    case 'wrong':
      return '間違えた・自信なしの問題'
    case 'weak':
      return '苦手問題'
    case 'category':
      return CATEGORIES.find((c) => c.id === source.id)?.label ?? '分野別'
    case 'term':
      return `用語：${source.label}`
    case 'figure':
      return `図解：${source.label}`
    case 'relation':
      return source.label ? `関係性：${source.label}` : '関係性クイズ'
  }
}

/** 出題の候補。出題しない問題はここで外す */
export function poolOf(source: Source): Question[] {
  const active = activeQuestions()
  switch (source.kind) {
    case 'all':
    case 'wrong':
    case 'weak':
      return active
    case 'category':
      return active.filter((q) => q.category === source.id)
    case 'term':
    case 'figure': {
      const ids = new Set(source.ids)
      return active.filter((q) => ids.has(q.id))
    }
    case 'relation':
      return relationQuestions(source.mapId)
  }
}
