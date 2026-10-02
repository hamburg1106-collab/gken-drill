import type { MapEdge, MapNode } from '../data/mapTypes'

// 図は幅360の座標系で描き、画面幅に合わせて拡大縮小する。
// 3列・箱幅96にしたのは、スマホの縦画面で文字が11px相当を保てる上限だから。
export const VIEW_W = 360
export const BOX_W = 96
const COL_STEP = 128
const COL_LEFT = 52
const ROW_STEP = 66
// 横向きの線のラベルは箱の上に出すので、最上段の上にその分の余白を取る
const ROW_TOP = 46
const LINE_H = 14
const BOX_PAD_Y = 16
export const NODE_FONT = 11
export const LABEL_FONT = 10
const LABEL_H = 14

/** 表示幅の概算。半角は0.6文字分として数える */
export function textWidth(text: string, size: number): number {
  let w = 0
  for (const ch of text) w += /[\x20-\x7e]/.test(ch) ? size * 0.6 : size
  return w
}

export type Box = {
  node: MapNode
  lines: string[]
  x: number
  y: number
  w: number
  h: number
}

export function boxOf(node: MapNode): Box {
  const lines = node.label.split('\n')
  return {
    node,
    lines,
    x: COL_LEFT + node.col * COL_STEP,
    y: ROW_TOP + node.row * ROW_STEP,
    w: BOX_W,
    h: lines.length * LINE_H + BOX_PAD_Y,
  }
}

export function viewHeight(boxes: Box[]): number {
  return Math.max(...boxes.map((b) => b.y + b.h / 2)) + 18
}

/** 箱の中心から (tx, ty) へ向かう直線が、箱の外周（少し外側）と交わる点 */
function clip(b: Box, tx: number, ty: number, gap: number): [number, number] {
  const dx = tx - b.x
  const dy = ty - b.y
  if (dx === 0 && dy === 0) return [b.x, b.y]
  const hw = b.w / 2 + gap
  const hh = b.h / 2 + gap
  const t = Math.min(dx === 0 ? Infinity : hw / Math.abs(dx), dy === 0 ? Infinity : hh / Math.abs(dy))
  return [b.x + dx * t, b.y + dy * t]
}

export type EdgeGeom = {
  edge: MapEdge
  x1: number
  y1: number
  x2: number
  y2: number
}

export function edgeGeom(edge: MapEdge, a: Box, b: Box): EdgeGeom {
  const [x1, y1] = clip(a, b.x, b.y, 3)
  const [x2, y2] = clip(b, a.x, a.y, 3)
  return { edge, x1, y1, x2, y2 }
}

export type LabelBox = { x: number; y: number; w: number; h: number }

/**
 * 線のラベルの位置（中心座標）。
 * 隣り合う列の箱を結ぶ横線は隙間が狭く、線の上に置くと箱に重なるため、箱の上側に出す。
 */
export function labelBox(g: EdgeGeom, a: Box, b: Box): LabelBox | null {
  const text = g.edge.label
  if (!text) return null
  const w = textWidth(text, LABEL_FONT) + 8
  const h = LABEL_H
  if (Math.abs(a.y - b.y) < 1 && Math.abs(g.x2 - g.x1) < w + 6) {
    const top = Math.min(a.y - a.h / 2, b.y - b.h / 2)
    return { x: (g.x1 + g.x2) / 2, y: top - h / 2 - 2, w, h }
  }
  return { x: (g.x1 + g.x2) / 2, y: (g.y1 + g.y2) / 2, w, h }
}

/** 線分が箱（少し内側）を横切るか。検証用 */
export function segmentHitsBox(g: EdgeGeom, b: Box): boolean {
  const left = b.x - b.w / 2 + 2
  const right = b.x + b.w / 2 - 2
  const top = b.y - b.h / 2 + 2
  const bottom = b.y + b.h / 2 - 2
  // Liang-Barsky
  let t0 = 0
  let t1 = 1
  const dx = g.x2 - g.x1
  const dy = g.y2 - g.y1
  const checks: [number, number][] = [
    [-dx, g.x1 - left],
    [dx, right - g.x1],
    [-dy, g.y1 - top],
    [dy, bottom - g.y1],
  ]
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return false
      continue
    }
    const r = q / p
    if (p < 0) {
      if (r > t1) return false
      if (r > t0) t0 = r
    } else {
      if (r < t0) return false
      if (r < t1) t1 = r
    }
  }
  return t0 <= t1
}
