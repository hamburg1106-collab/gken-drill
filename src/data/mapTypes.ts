import type { CategoryId } from './types'

/**
 * 線の種類。用語どうしの「どうつながっているか」を5つに絞って描き分ける。
 * - evolve:   発展・改良（A を元に B ができた／A から B へ進む）
 * - include:  包含・構成要素（A の中に B がある）
 * - contrast: 対比（取り違えやすいペア）
 * - solve:    対策（課題 A を B で解く）
 * - cause:    原因（A が原因で課題 B が起きる）
 */
export type EdgeType = 'evolve' | 'include' | 'contrast' | 'solve' | 'cause'

export type MapNode = {
  id: string
  /** 図に出す名前。改行は \n。1行は全角8文字まで（箱の幅に収めるため） */
  label: string
  /** group は上位概念のまとめ役、problem は課題 */
  kind?: 'term' | 'group' | 'problem'
  /** 配置。列は 0〜2（0.5刻み可）、行は 0 から下へ（小数可） */
  col: number
  row: number
  /** タップしたときに出す短い説明 */
  def: string
  /**
   * 関連問題を探すキーワード。問題文と選択肢の文言に含まれていれば関連とみなす。
   * 省略時は label（改行を除く）で探す。空配列なら関連問題を出さない。
   */
  match?: string[]
}

export type MapEdge = {
  from: string
  to: string
  type: EdgeType
  /** 線の上に出す短い説明。全角6文字程度まで */
  label?: string
}

export type TermMap = {
  id: string
  category: CategoryId
  title: string
  /** 一覧に出す一言 */
  summary: string
  nodes: MapNode[]
  edges: MapEdge[]
}

export const EDGE_TYPE_LABEL: Record<EdgeType, string> = {
  evolve: '発展・改良',
  include: '含む',
  contrast: '対比・混同注意',
  solve: '対策',
  cause: '原因',
}
