import type { Question } from '../data'
import { TERM_MAPS } from '../data/maps'
import { buildRelationQuestions } from './relationGen'

export { isRelationId } from './relationGen'

let cache: Question[] | null = null

/** 用語マップの線から作った関係性クイズ。mapId を渡すとその図の分だけ */
export function relationQuestions(mapId?: string): Question[] {
  cache ??= buildRelationQuestions(TERM_MAPS)
  return mapId ? cache.filter((q) => q.id.startsWith(`r:${mapId}:`)) : cache
}
