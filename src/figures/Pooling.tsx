import { useState } from 'react'

// 4×4の特徴マップを2×2ずつまとめて2×2にする。
// 「ずらした後」は、各2×2の中で強い反応の位置が1マス動いたもの。まとめた結果は変わらない。

const BEFORE = [
  [0, 9, 1, 0],
  [1, 2, 0, 1],
  [0, 1, 3, 0],
  [2, 0, 1, 6],
]
const AFTER = [
  [1, 0, 0, 1],
  [9, 2, 1, 0],
  [0, 1, 6, 0],
  [2, 0, 1, 3],
]

const C = 34
const OC = 44

function pool(map: number[][], mode: 'max' | 'avg'): number[][] {
  return [0, 1].map((br) =>
    [0, 1].map((bc) => {
      const vs = [0, 1].flatMap((r) => [0, 1].map((c) => map[br * 2 + r]![bc * 2 + c]!))
      return mode === 'max' ? Math.max(...vs) : vs.reduce((a, b) => a + b, 0) / 4
    }),
  )
}

export function Pooling() {
  const [mode, setMode] = useState<'max' | 'avg'>('max')
  const [shifted, setShifted] = useState(false)
  const [block, setBlock] = useState(0)

  const map = shifted ? AFTER : BEFORE
  const out = pool(map, mode)
  const same = JSON.stringify(pool(BEFORE, mode)) === JSON.stringify(pool(AFTER, mode))
  const changedCells = BEFORE.flat().filter((v, i) => v !== AFTER.flat()[i]).length
  const br = Math.floor(block / 2)
  const bc = block % 2
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, ''))

  const inX = 6
  const oX = inX + 4 * C + 46
  const top = 22

  return (
    <div className="fig">
      <svg viewBox={`0 0 340 ${top + 4 * C + 6}`} className="fig-svg" role="img" aria-label="プーリングの計算">
        <text className="fig-tick" x={inX} y={14}>
          特徴マップ 4×4
        </text>
        <text className="fig-tick" x={oX} y={14}>
          まとめた結果 2×2
        </text>
        {map.flat().map((v, i) => {
          const r = Math.floor(i / 4)
          const c = i % 4
          const inBlock = Math.floor(r / 2) === br && Math.floor(c / 2) === bc
          return (
            <g key={i} onClick={() => setBlock(Math.floor(r / 2) * 2 + Math.floor(c / 2))} className="tap">
              <rect
                className="cell"
                style={{ fillOpacity: 1, fill: `rgb(57 135 229 / ${0.12 + (v / 9) * 0.75})` }}
                x={inX + c * C}
                y={top + r * C}
                width={C - 3}
                height={C - 3}
                rx={4}
              />
              <text className={`cell-text${inBlock ? ' cell-text-strong' : ''}`} x={inX + c * C + (C - 3) / 2} y={top + r * C + 21} textAnchor="middle">
                {v}
              </text>
            </g>
          )
        })}
        {/* 2×2の区切り */}
        <line className="pool-split" x1={inX + 2 * C - 1.5} x2={inX + 2 * C - 1.5} y1={top} y2={top + 4 * C - 3} />
        <line className="pool-split" x1={inX} x2={inX + 4 * C - 3} y1={top + 2 * C - 1.5} y2={top + 2 * C - 1.5} />
        <rect className="cell-window" x={inX + bc * 2 * C - 1} y={top + br * 2 * C - 1} width={2 * C - 1} height={2 * C - 1} rx={5} />
        <text className="fig-tick" x={oX - 23} y={top + 2 * C + 4} textAnchor="middle">
          →
        </text>

        {out.flat().map((v, i) => {
          const r = Math.floor(i / 2)
          const c = i % 2
          return (
            <g key={i} onClick={() => setBlock(i)} className="tap">
              <rect
                className={`cell${i === block ? ' cell-current' : ''}`}
                x={oX + c * OC}
                y={top + 2 * C - OC + r * OC}
                width={OC - 4}
                height={OC - 4}
                rx={5}
              />
              <text className="cell-text cell-text-l" x={oX + c * OC + (OC - 4) / 2} y={top + 2 * C - OC + r * OC + 26} textAnchor="middle">
                {fmt(v)}
              </text>
            </g>
          )
        })}
      </svg>

      <p className="fig-readout" aria-live="polite">
        囲んだ4マス {map[br * 2]![bc * 2]}・{map[br * 2]![bc * 2 + 1]}・{map[br * 2 + 1]![bc * 2]}・{map[br * 2 + 1]![bc * 2 + 1]} の
        {mode === 'max' ? '最大値' : '平均'} → <strong>{fmt(out[br]![bc]!)}</strong>
        <br />
        {shifted
          ? `ずらしたことで特徴マップは${changedCells}マスも変わったのに、まとめた結果は${same ? '同じまま' : '少し変わった'}。`
          : '「反応を1マスずらす」を押して、まとめた結果が変わるか見てみよう。'}
      </p>

      <div className="fig-row">
        <span className="fig-row-label">まとめ方</span>
        <div className="fig-presets">
          <button className={mode === 'max' ? 'on' : ''} onClick={() => setMode('max')}>
            最大プーリング
          </button>
          <button className={mode === 'avg' ? 'on' : ''} onClick={() => setMode('avg')}>
            平均プーリング
          </button>
        </div>
      </div>
      <div className="fig-buttons">
        <button className={`btn${shifted ? '' : ' btn-primary'}`} onClick={() => setShifted((s) => !s)}>
          {shifted ? '元に戻す' : '反応を1マスずらす'}
        </button>
      </div>

      <p className="fig-note">
        数字は特徴（ここでは猫の耳らしさ）への反応の強さ。マスをタップすると、どの4マスをまとめたかが分かる。最大プーリングは一番強い反応（9）だけを残し、平均プーリングは全体をならす（3）。どちらも、猫の耳が少しずれたくらいでは結果が変わらない。
      </p>
    </div>
  )
}
