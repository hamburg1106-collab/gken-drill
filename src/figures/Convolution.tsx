import { useEffect, useState } from 'react'

// 5×5の画像（真ん中に縦線）に3×3のフィルタを滑らせる。
// 出力サイズ ＝ (入力 ＋ 2×パディング − フィルタ) ÷ ストライド ＋ 1

const IMAGE = [
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
]
const FILTERS = {
  v: {
    label: '縦線フィルタ',
    k: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  },
  h: {
    label: '横線フィルタ',
    k: [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
} as const
type FilterId = keyof typeof FILTERS

const N = 5
const F = 3
const C = 20 // 入力・出力のマスの大きさ
const FC = 16 // フィルタのマスの大きさ

export function Convolution() {
  const [filter, setFilter] = useState<FilterId>('v')
  const [pad, setPad] = useState(0)
  const [stride, setStride] = useState(1)
  const [pos, setPos] = useState(0)
  const [playing, setPlaying] = useState(false)

  const size = N + 2 * pad // パディング込みの入力の大きさ
  const out = Math.floor((size - F) / stride) + 1
  const total = out * out
  const k = FILTERS[filter].k

  const at = (r: number, c: number) => {
    const ir = r - pad
    const ic = c - pad
    return ir < 0 || ic < 0 || ir >= N || ic >= N ? 0 : IMAGE[ir]![ic]!
  }
  const valueAt = (i: number) => {
    const r0 = Math.floor(i / out) * stride
    const c0 = (i % out) * stride
    let s = 0
    for (let r = 0; r < F; r++) for (let c = 0; c < F; c++) s += at(r0 + r, c0 + c) * k[r]![c]!
    return s
  }

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setPos((p) => {
        if (p >= total - 1) {
          setPlaying(false)
          return p
        }
        return p + 1
      })
    }, 450)
    return () => clearInterval(id)
  }, [playing, total])

  function change(next: { filter?: FilterId; pad?: number; stride?: number }) {
    setPlaying(false)
    setPos(0)
    if (next.filter) setFilter(next.filter)
    if (next.pad !== undefined) setPad(next.pad)
    if (next.stride !== undefined) setStride(next.stride)
  }

  const wr = Math.floor(pos / out) * stride
  const wc = (pos % out) * stride
  const inX = 4
  const fX = inX + 7 * C + 14
  const oX = fX + F * FC + 14
  const top = 22
  // パディング0のときは入力が5×5なので、その分だけ図の高さを詰める
  const svgH = top + Math.max(size * C, 2 * C + F * FC) + 6

  return (
    <div className="fig">
      <svg viewBox={`0 0 340 ${svgH}`} className="fig-svg" role="img" aria-label="畳み込みの計算">
        <text className="fig-tick" x={inX} y={14}>
          入力 {size}×{size}
        </text>
        <text className="fig-tick" x={fX} y={14}>
          フィルタ
        </text>
        <text className="fig-tick" x={oX} y={14}>
          出力 {out}×{out}
        </text>

        {/* 入力（パディングの0は点線のマス） */}
        {Array.from({ length: size * size }, (_, i) => {
          const r = Math.floor(i / size)
          const c = i % size
          const isPad = r < pad || c < pad || r >= size - pad || c >= size - pad
          const v = at(r, c)
          return (
            <g key={i}>
              <rect
                className={`cell${isPad ? ' cell-pad' : v ? ' cell-on' : ''}`}
                x={inX + c * C}
                y={top + r * C}
                width={C - 2}
                height={C - 2}
                rx={3}
              />
              <text className="cell-text" x={inX + c * C + (C - 2) / 2} y={top + r * C + 14} textAnchor="middle">
                {v}
              </text>
            </g>
          )
        })}
        <rect className="cell-window" x={inX + wc * C - 1} y={top + wr * C - 1} width={F * C} height={F * C} rx={4} />

        {/* フィルタ */}
        {k.flat().map((v, i) => (
          <g key={i}>
            <rect
              className={`cell${v ? ' cell-filter' : ''}`}
              x={fX + (i % F) * FC}
              y={top + 2 * C + Math.floor(i / F) * FC}
              width={FC - 2}
              height={FC - 2}
              rx={2}
            />
            <text className="cell-text cell-text-s" x={fX + (i % F) * FC + (FC - 2) / 2} y={top + 2 * C + Math.floor(i / F) * FC + 11} textAnchor="middle">
              {v}
            </text>
          </g>
        ))}

        {/* 出力（計算済みのマスだけ数字を出す） */}
        {Array.from({ length: total }, (_, i) => {
          const r = Math.floor(i / out)
          const c = i % out
          const done = i <= pos
          const v = valueAt(i)
          return (
            <g key={i}>
              <rect
                className={`cell${i === pos ? ' cell-current' : done && v > 0 ? ' cell-hit' : ''}`}
                x={oX + c * C}
                y={top + r * C}
                width={C - 2}
                height={C - 2}
                rx={3}
              />
              {done && (
                <text className="cell-text" x={oX + c * C + (C - 2) / 2} y={top + r * C + 14} textAnchor="middle">
                  {v}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <p className="fig-readout" aria-live="polite">
        {pos + 1}/{total}か所目：重なったマスどうしを掛けて合計すると <strong>{valueAt(pos)}</strong>
        <br />
        出力の大きさ ＝ ({N} ＋ 2×{pad} − {F}) ÷ {stride} ＋ 1 ＝ <strong>{out}</strong>
      </p>

      <div className="fig-row">
        <span className="fig-row-label">フィルタ</span>
        <div className="fig-presets">
          {(Object.keys(FILTERS) as FilterId[]).map((id) => (
            <button key={id} className={filter === id ? 'on' : ''} onClick={() => change({ filter: id })}>
              {FILTERS[id].label}
            </button>
          ))}
        </div>
      </div>
      <div className="fig-row">
        <span className="fig-row-label">パディング</span>
        <div className="fig-presets">
          {[0, 1].map((v) => (
            <button key={v} className={pad === v ? 'on' : ''} onClick={() => change({ pad: v })}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="fig-row">
        <span className="fig-row-label">ストライド</span>
        <div className="fig-presets">
          {[1, 2].map((v) => (
            <button key={v} className={stride === v ? 'on' : ''} onClick={() => change({ stride: v })}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="fig-buttons">
        <button className="btn" onClick={() => setPos((p) => Math.min(total - 1, p + 1))} disabled={playing || pos >= total - 1}>
          1マス進める
        </button>
        <button className="btn btn-primary" onClick={() => setPlaying(true)} disabled={playing || pos >= total - 1}>
          自動で最後まで
        </button>
        <button className="btn btn-ghost" onClick={() => change({})}>
          最初から
        </button>
      </div>

      <p className="fig-note">
        縦線フィルタは、縦線の上に重なったときだけ大きな値（3）を出す。これが「特徴を見つける」ということ。横線フィルタに替えると反応が弱くなる。パディングを1にすると出力が入力と同じ5×5に、ストライドを2にすると出力が小さくなる。
      </p>
    </div>
  )
}
