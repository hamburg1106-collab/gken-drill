import { useMemo, useState } from 'react'

// 本当の関係は y = 0.8·sin(πx)。そこに雑音を足した「練習用（訓練）」と「本番用（テスト）」の点を10個ずつ用意し、
// 次数を変えた多項式を練習用の点だけで当てはめる。次数を上げるほど練習用には合うが、本番用で外れていく。

const TRAIN_X = [-0.95, -0.75, -0.55, -0.35, -0.15, 0.05, 0.25, 0.45, 0.65, 0.85]
const TRAIN_NOISE = [0.12, -0.1, 0.08, -0.15, 0.1, -0.05, 0.14, -0.12, 0.06, -0.09]
const TEST_X = [-0.85, -0.65, -0.45, -0.25, -0.05, 0.15, 0.35, 0.55, 0.75, 0.95]
const TEST_NOISE = [-0.08, 0.11, -0.06, 0.09, -0.12, 0.07, -0.1, 0.05, -0.07, 0.1]
const truth = (x: number) => 0.8 * Math.sin(Math.PI * x)
const TRAIN = TRAIN_X.map((x, i) => ({ x, y: truth(x) + TRAIN_NOISE[i]! }))
const TEST = TEST_X.map((x, i) => ({ x, y: truth(x) + TEST_NOISE[i]! }))
const MAX_DEGREE = 9

/** 最小二乗法で多項式の係数を求める（正規方程式をガウスの消去法で解く） */
function fit(points: { x: number; y: number }[], degree: number): number[] {
  const n = degree + 1
  const a = Array.from({ length: n }, () => Array.from({ length: n + 1 }, () => 0))
  for (const { x, y } of points) {
    const pw = Array.from({ length: n }, (_, k) => x ** k)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) a[i]![j]! += pw[i]! * pw[j]!
      a[i]![n]! += pw[i]! * y
    }
  }
  // 次数9で点が10個のときも解けるよう、ごく小さな値を対角に足して数値を安定させる
  for (let i = 0; i < n; i++) a[i]![i]! += 1e-10
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[p]![c]!)) p = r
    ;[a[c], a[p]] = [a[p]!, a[c]!]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const k = a[r]![c]! / a[c]![c]!
      for (let j = c; j <= n; j++) a[r]![j]! -= k * a[c]![j]!
    }
  }
  return a.map((row, i) => row[n]! / row[i]!)
}

const evalPoly = (coef: number[], x: number) => coef.reduce((s, c, k) => s + c * x ** k, 0)
const rmse = (coef: number[], pts: { x: number; y: number }[]) =>
  Math.sqrt(pts.reduce((s, p) => s + (evalPoly(coef, p.x) - p.y) ** 2, 0) / pts.length)

const W = 340
const H = 200
const sx = (x: number) => 10 + ((x + 1.05) / 2.1) * (W - 20)
const sy = (y: number) => H / 2 - (y / 1.6) * (H / 2 - 8)

// 誤差のグラフ
const EH = 120
const E_MAX = 0.6
const ex = (d: number) => 40 + ((d - 1) / (MAX_DEGREE - 1)) * (W - 60)
const ey = (e: number) => EH - 20 - (Math.min(e, E_MAX) / E_MAX) * (EH - 34)

function verdict(train: number, test: number): string {
  if (train > 0.25) return '単純すぎて、練習用の点にも合っていない（未学習）'
  if (test > train * 2.2) return '練習用の点には合わせすぎて、本番用の点で大きく外れている（過学習）'
  return '練習用にも本番用にも、ほどよく合っている'
}

export function Overfitting() {
  const [degree, setDegree] = useState(3)

  const all = useMemo(
    () =>
      Array.from({ length: MAX_DEGREE }, (_, i) => {
        const coef = fit(TRAIN, i + 1)
        return { coef, train: rmse(coef, TRAIN), test: rmse(coef, TEST) }
      }),
    [],
  )
  const cur = all[degree - 1]!
  const curve = Array.from({ length: 161 }, (_, i) => {
    const x = -1.05 + (i / 160) * 2.1
    return `${sx(x)},${sy(evalPoly(cur.coef, x))}`
  }).join(' ')

  return (
    <div className="fig">
      <ul className="chart-legend">
        <li>
          <span className="dot-key dot-key-train" aria-hidden="true" />
          練習用の点（訓練データ）
        </li>
        <li>
          <span className="dot-key dot-key-test" aria-hidden="true" />
          本番用の点（テストデータ）
        </li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="fig-svg" role="img" aria-label="多項式の当てはめ">
        <defs>
          <clipPath id="of-clip">
            <rect x={0} y={0} width={W} height={H} />
          </clipPath>
        </defs>
        <line className="fig-axis" x1={0} x2={W} y1={sy(0)} y2={sy(0)} />
        <polyline className="fig-curve" points={curve} clipPath="url(#of-clip)" />
        {TEST.map((p, i) => (
          <circle key={`t${i}`} className="pt-test" cx={sx(p.x)} cy={sy(p.y)} r={5} />
        ))}
        {TRAIN.map((p, i) => (
          <circle key={`r${i}`} className="pt-train" cx={sx(p.x)} cy={sy(p.y)} r={5} />
        ))}
      </svg>

      <p className="fig-readout" aria-live="polite">
        次数 {degree}・練習用のずれ {cur.train.toFixed(2)}・本番用のずれ {cur.test.toFixed(2)}
        <br />
        <strong>{verdict(cur.train, cur.test)}</strong>
      </p>

      <label className="fig-slider">
        <span>
          モデルの複雑さ（多項式の次数）<strong>{degree}</strong>
        </span>
        <input type="range" min={1} max={MAX_DEGREE} step={1} value={degree} onChange={(e) => setDegree(Number(e.target.value))} />
      </label>

      <h3 className="fig-sub">次数ごとの「ずれ」</h3>
      <ul className="chart-legend">
        <li>
          <span className="swatch swatch-sure" aria-hidden="true" />
          練習用
        </li>
        <li>
          <span className="swatch swatch-all" aria-hidden="true" />
          本番用
        </li>
      </ul>
      <svg viewBox={`0 0 ${W} ${EH}`} className="fig-svg" role="img" aria-label="次数ごとの誤差">
        <line className="fig-axis" x1={40} x2={W - 20} y1={ey(0)} y2={ey(0)} />
        <text className="fig-tick" x={34} y={ey(0) + 4} textAnchor="end">
          0
        </text>
        <text className="fig-tick" x={34} y={ey(E_MAX) + 4} textAnchor="end">
          {E_MAX}
        </text>
        <line className="chart-cross" x1={ex(degree)} x2={ex(degree)} y1={ey(E_MAX)} y2={ey(0)} />
        <polyline className="chart-line chart-line-sure" points={all.map((e, i) => `${ex(i + 1)},${ey(e.train)}`).join(' ')} />
        <polyline className="chart-line chart-line-all" points={all.map((e, i) => `${ex(i + 1)},${ey(e.test)}`).join(' ')} />
        {all.map((e, i) => (
          <g key={i}>
            <circle className="chart-dot chart-dot-sure" cx={ex(i + 1)} cy={ey(e.train)} r={4} />
            <circle className="chart-dot chart-dot-all" cx={ex(i + 1)} cy={ey(e.test)} r={4} />
            <text className="fig-tick" x={ex(i + 1)} y={EH - 4} textAnchor="middle">
              {i + 1}
            </text>
          </g>
        ))}
        {all.some((e) => e.test > E_MAX) && (
          <text className="fig-tick" x={ex(1)} y={ey(E_MAX) + 4}>
            ↑ 上端の点は、実際はもっと大きい
          </text>
        )}
      </svg>

      <p className="fig-note">
        次数を上げるほど、練習用のずれは0に近づく。でも本番用のずれは、ある所から逆に大きくなる。これが過学習。ちょうどいい複雑さは「本番用のずれ」が一番小さい所。
      </p>
    </div>
  )
}
