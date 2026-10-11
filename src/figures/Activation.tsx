import { useState } from 'react'

// 活性化関数の形と傾き（微分）を並べて描き、「入力が x のときの傾き」を層の数だけ掛けたら
// 勾配がどれだけ残るかを見せる。勾配消失は、1未満の傾きを何度も掛けることで起きる。

const erf = (x: number) => {
  // Abramowitz-Stegun 7.1.26 の近似（誤差は1e-7程度で、図には十分）
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return x >= 0 ? y : -y
}
const phi = (x: number) => Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI)
const Phi = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2))
const sig = (x: number) => 1 / (1 + Math.exp(-x))

type Fn = { id: string; label: string; f: (x: number) => number; d: (x: number) => number; note: string }

const FNS: Fn[] = [
  {
    id: 'sigmoid',
    label: 'シグモイド',
    f: sig,
    d: (x) => sig(x) * (1 - sig(x)),
    note: '出力は0〜1。傾きは最大でも0.25しかないので、層を重ねると勾配がすぐに消える。',
  },
  {
    id: 'tanh',
    label: 'tanh',
    f: Math.tanh,
    d: (x) => 1 - Math.tanh(x) ** 2,
    note: '出力は−1〜1で0が中心。傾きの最大は1とシグモイドより大きいが、入力が0から離れると傾きは小さくなる。',
  },
  {
    id: 'relu',
    label: 'ReLU',
    f: (x) => Math.max(0, x),
    d: (x) => (x > 0 ? 1 : 0),
    note: '入力が正なら傾きはいつも1。何層重ねても勾配が小さくならない。負の入力では傾き0になる。',
  },
  {
    id: 'leaky',
    label: 'Leaky ReLU',
    f: (x) => (x > 0 ? x : 0.1 * x),
    d: (x) => (x > 0 ? 1 : 0.1),
    note: 'ReLUの負の側に小さな傾き（ここでは0.1）を残したもの。負の入力でも勾配が完全には0にならない。',
  },
  {
    id: 'gelu',
    label: 'GELU',
    f: (x) => x * Phi(x),
    d: (x) => Phi(x) + x * phi(x),
    note: 'ReLUの折れ目を滑らかにしたような形。BERTやGPTなどTransformer系で使われる。',
  },
]

const W = 340
const H = 190
const X_RANGE = 4
const Y_MIN = -1.5
const Y_MAX = 3
const sx = (x: number) => 20 + ((x + X_RANGE) / (2 * X_RANGE)) * (W - 40)
const sy = (y: number) => 10 + ((Y_MAX - y) / (Y_MAX - Y_MIN)) * (H - 20)

function fmt(v: number): string {
  if (v === 0) return '0'
  if (v >= 0.01) return v.toFixed(v >= 1 ? 2 : 3)
  return v.toExponential(1).replace('e-', '×10^-')
}

export function Activation() {
  const [id, setId] = useState('sigmoid')
  const [input, setInput] = useState(1)
  const [layers, setLayers] = useState(10)
  const fn = FNS.find((f) => f.id === id)!

  const line = (g: (x: number) => number) =>
    Array.from({ length: 121 }, (_, i) => {
      const x = -X_RANGE + (i / 120) * 2 * X_RANGE
      return `${sx(x)},${sy(Math.max(Y_MIN, Math.min(Y_MAX, g(x))))}`
    }).join(' ')

  const slope = fn.d(input)
  const remain = slope ** layers

  return (
    <div className="fig">
      <div className="fig-presets" role="group" aria-label="活性化関数">
        {FNS.map((f) => (
          <button key={f.id} className={f.id === id ? 'on' : ''} aria-pressed={f.id === id} onClick={() => setId(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <ul className="chart-legend">
        <li>
          <span className="swatch swatch-sure" aria-hidden="true" />
          関数の形（出力）
        </li>
        <li>
          <span className="swatch swatch-all" aria-hidden="true" />
          傾き（微分）
        </li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="fig-svg" role="img" aria-label={`${fn.label}の形と傾き`}>
        <line className="fig-axis" x1={sx(-X_RANGE)} x2={sx(X_RANGE)} y1={sy(0)} y2={sy(0)} />
        <line className="fig-axis" x1={sx(0)} x2={sx(0)} y1={sy(Y_MAX)} y2={sy(Y_MIN)} />
        <line className="fig-guide" x1={sx(-X_RANGE)} x2={sx(X_RANGE)} y1={sy(1)} y2={sy(1)} />
        <text className="fig-tick" x={sx(-X_RANGE)} y={sy(1) - 4}>
          1
        </text>
        <polyline className="chart-line chart-line-all" points={line(fn.d)} />
        <polyline className="chart-line chart-line-sure" points={line(fn.f)} />
        <line className="chart-cross" x1={sx(input)} x2={sx(input)} y1={sy(Y_MAX)} y2={sy(Y_MIN)} />
        <circle className="chart-dot chart-dot-all" cx={sx(input)} cy={sy(slope)} r={5} />
        <circle className="chart-dot chart-dot-sure" cx={sx(input)} cy={sy(Math.min(Y_MAX, fn.f(input)))} r={5} />
      </svg>
      <p className="fig-note">{fn.note}</p>

      <label className="fig-slider">
        <span>
          入力 x <strong>{input.toFixed(1)}</strong>（このときの傾き <strong>{fmt(slope)}</strong>）
        </span>
        <input type="range" min={-3} max={3} step={0.1} value={input} onChange={(e) => setInput(Number(e.target.value))} />
      </label>
      <label className="fig-slider">
        <span>
          層の数 <strong>{layers}</strong>
        </span>
        <input type="range" min={1} max={30} step={1} value={layers} onChange={(e) => setLayers(Number(e.target.value))} />
      </label>

      <div className="fig-meter" aria-live="polite">
        <p>
          入口まで届く勾配：傾き {fmt(slope)} を {layers} 回掛けると <strong>{fmt(remain)}</strong>
        </p>
        <div className="fig-bar" aria-hidden="true">
          <div style={{ width: `${Math.min(1, remain) * 100}%` }} />
        </div>
        <p className="fig-note">
          {remain > 2
            ? '1より大きい傾きを何度も掛けたので、逆に大きくなりすぎている（勾配爆発）。'
            : remain >= 0.5
            ? '勾配がしっかり残っていて、入口に近い層まで学習できる。'
            : remain >= 0.01
              ? '勾配がかなり小さくなっている。入口に近い層ほど学習が遅い。'
              : 'ほぼ0。入口に近い層には何も届かず、学習が止まる（勾配消失）。'}
        </p>
      </div>

      <p className="fig-note">
        実際のネットワークでは層ごとに入力も重みも違うが、「1未満の傾きを何度も掛けると0に近づく」という仕組みは同じ。シグモイドとReLUで、層の数を20にして比べてみよう。
      </p>
    </div>
  )
}
