import { useMemo, useState } from 'react'
import { ALL_QUESTIONS } from '../data'
import type { EdgeType, MapEdge, MapNode, TermMap } from '../data/mapTypes'
import { EDGE_TYPE_LABEL } from '../data/mapTypes'
import type { Box, EdgeGeom } from '../lib/mapLayout'
import { LABEL_FONT, NODE_FONT, VIEW_W, boxOf, edgeGeom, labelBox, viewHeight } from '../lib/mapLayout'
import { relatedQuestionIds } from '../lib/related'

type Props = {
  map: TermMap
  onBack: () => void
  onQuiz: (label: string, ids: string[]) => void
}

const nameOf = (n: MapNode) => n.label.replace(/\n/g, '')

const ARROW_END: Record<EdgeType, boolean> = {
  evolve: true,
  include: false,
  contrast: true,
  solve: true,
  cause: true,
}

function sentence(e: MapEdge, nodes: Map<string, MapNode>): string {
  const a = nodes.get(e.from)
  const b = nodes.get(e.to)
  if (!a || !b) return ''
  const A = nameOf(a)
  const B = nameOf(b)
  const base = {
    evolve: `${A} → ${B}`,
    include: `${A} ⊃ ${B}`,
    contrast: `${A} ↔ ${B}`,
    solve: `${A} の対策 → ${B}`,
    cause: `${A} が原因 → ${B}`,
  }[e.type]
  return e.label ? `${base}（${e.label}）` : base
}

function arrowHead(x1: number, y1: number, x2: number, y2: number): string {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const bx = x2 - 8 * cos
  const by = y2 - 8 * sin
  return `${x2},${y2} ${bx - 4 * sin},${by + 4 * cos} ${bx + 4 * sin},${by - 4 * cos}`
}

function EdgeLine({ g, dim }: { g: EdgeGeom; dim: boolean }) {
  const { edge, x1, y1, x2, y2 } = g
  return (
    <g className={`edge edge-${edge.type}${dim ? ' dim' : ''}`}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {ARROW_END[edge.type] && <polygon points={arrowHead(x1, y1, x2, y2)} />}
      {edge.type === 'contrast' && <polygon points={arrowHead(x2, y2, x1, y1)} />}
    </g>
  )
}

/** ラベルは全部の線を描いた後に重ね、別の線の下に潜らないようにする */
function EdgeLabel({ g, a, b, dim }: { g: EdgeGeom; a: Box; b: Box; dim: boolean }) {
  const lb = labelBox(g, a, b)
  if (!lb) return null
  return (
    <g className={`edge edge-label${dim ? ' dim' : ''}`}>
      <rect x={lb.x - lb.w / 2} y={lb.y - lb.h / 2} width={lb.w} height={lb.h} rx={4} />
      <text x={lb.x} y={lb.y} fontSize={LABEL_FONT} textAnchor="middle" dominantBaseline="central">
        {g.edge.label}
      </text>
    </g>
  )
}

export function TermMapView({ map, onBack, onQuiz }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const { boxes, geoms, height, nodeIndex } = useMemo(() => {
    const boxes = new Map(map.nodes.map((n) => [n.id, boxOf(n)]))
    const geoms = map.edges.flatMap((e) => {
      const a = boxes.get(e.from)
      const b = boxes.get(e.to)
      return a && b ? [{ g: edgeGeom(e, a, b), a, b }] : []
    })
    return {
      boxes,
      geoms,
      height: viewHeight([...boxes.values()]),
      nodeIndex: new Map(map.nodes.map((n) => [n.id, n])),
    }
  }, [map])

  const linked = useMemo(() => {
    if (!selected) return null
    const set = new Set([selected])
    for (const e of map.edges) {
      if (e.from === selected) set.add(e.to)
      if (e.to === selected) set.add(e.from)
    }
    return set
  }, [map, selected])

  const node = selected ? nodeIndex.get(selected) : undefined
  const related = node ? relatedQuestionIds(node, ALL_QUESTIONS) : []
  const nodeEdges = node ? map.edges.filter((e) => e.from === node.id || e.to === node.id) : []

  return (
    <div className={`screen term-map${node ? ' has-sheet' : ''}`}>
      <header className="sub-head">
        <button className="back" onClick={onBack} aria-label="用語マップの一覧に戻る">
          ←
        </button>
        <h1>{map.title}</h1>
      </header>
      <p className="lede">{map.summary}</p>

      <ul className="legend" aria-label="線の種類">
        {(Object.keys(EDGE_TYPE_LABEL) as EdgeType[]).map((t) => (
          <li key={t}>
            <svg width="26" height="10" aria-hidden="true" className={`edge edge-${t}`}>
              <line x1="1" y1="5" x2={ARROW_END[t] ? 18 : 25} y2="5" />
              {ARROW_END[t] && <polygon points="25,5 17,1 17,9" />}
            </svg>
            {EDGE_TYPE_LABEL[t]}
          </li>
        ))}
      </ul>

      <div className="diagram">
        <svg
          viewBox={`0 0 ${VIEW_W} ${height}`}
          width="100%"
          role="img"
          aria-label={`${map.title}の図。下に同じ内容を文章でも載せています`}
          onClick={() => setSelected(null)}
        >
          {geoms.map(({ g }, i) => (
            <EdgeLine key={i} g={g} dim={!!selected && g.edge.from !== selected && g.edge.to !== selected} />
          ))}
          {geoms.map(({ g, a, b }, i) => (
            <EdgeLabel key={i} g={g} a={a} b={b} dim={!!selected && g.edge.from !== selected && g.edge.to !== selected} />
          ))}
          {[...boxes.values()].map((b) => {
            const kind = b.node.kind ?? 'term'
            const dim = !!linked && !linked.has(b.node.id)
            const active = b.node.id === selected
            return (
              <g
                key={b.node.id}
                className={`node node-${kind}${dim ? ' dim' : ''}${active ? ' active' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={nameOf(b.node)}
                onClick={(ev) => {
                  ev.stopPropagation()
                  setSelected(active ? null : b.node.id)
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    setSelected(active ? null : b.node.id)
                  }
                }}
              >
                <rect x={b.x - b.w / 2} y={b.y - b.h / 2} width={b.w} height={b.h} rx={8} />
                <text fontSize={NODE_FONT} textAnchor="middle">
                  {b.lines.map((line, i) => (
                    <tspan key={i} x={b.x} y={b.y + (i - (b.lines.length - 1) / 2) * 14} dominantBaseline="central">
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <section className="relations">
        <h2>つながり</h2>
        <ul>
          {map.edges.map((e, i) => (
            <li key={i}>
              <span className={`rel-chip rel-${e.type}`}>{EDGE_TYPE_LABEL[e.type]}</span>
              <span>{sentence(e, nodeIndex)}</span>
            </li>
          ))}
        </ul>
      </section>

      {node && (
        <div className="sheet" role="dialog" aria-label={`${nameOf(node)}の説明`}>
          <div className="sheet-head">
            <span className="sheet-title">{nameOf(node)}</span>
            {node.kind === 'problem' && <span className="chip chip-problem">課題</span>}
            {node.kind === 'group' && <span className="chip">まとめ</span>}
            <button className="sheet-close" onClick={() => setSelected(null)} aria-label="閉じる">
              ✕
            </button>
          </div>
          <p className="sheet-def">{node.def}</p>
          {nodeEdges.length > 0 && (
            <ul className="sheet-rels">
              {nodeEdges.map((e, i) => (
                <li key={i}>
                  <span className={`rel-chip rel-${e.type}`}>{EDGE_TYPE_LABEL[e.type]}</span>
                  <span>{sentence(e, nodeIndex)}</span>
                </li>
              ))}
            </ul>
          )}
          {related.length > 0 && (
            <button className="btn btn-primary sheet-quiz" onClick={() => onQuiz(nameOf(node), related)}>
              この用語の問題を解く（{related.length}問）
            </button>
          )}
        </div>
      )}
    </div>
  )
}
