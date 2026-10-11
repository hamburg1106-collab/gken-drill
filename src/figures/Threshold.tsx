import { useState } from 'react'

// メール20通に、モデルが付けた「スパムらしさ」の点数。上の段が本当のスパム、下の段が普通のメール。
// 判定ラインより右をスパムと判定したときの、見逃し・誤判定と各指標を見せる。

const SPAM = [0.95, 0.9, 0.82, 0.75, 0.66, 0.58, 0.41, 0.3]
const HAM = [0.72, 0.55, 0.48, 0.38, 0.33, 0.27, 0.2, 0.16, 0.12, 0.08, 0.05, 0.02]

const W = 340
const H = 120
const sx = (v: number) => 16 + v * (W - 32)
const ROW_SPAM = 38
const ROW_HAM = 82

const pct = (n: number, d: number) => (d === 0 ? '—' : `${Math.round((n / d) * 100)}%`)

export function Threshold() {
  const [t, setT] = useState(0.5)

  const tp = SPAM.filter((s) => s >= t).length
  const fn = SPAM.length - tp
  const fp = HAM.filter((s) => s >= t).length
  const tn = HAM.length - fp
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp)
  const recall = tp / SPAM.length
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)

  const metrics = [
    { label: '適合率（スパム判定のうち本当にスパム）', v: precision, show: pct(tp, tp + fp) },
    { label: '再現率（本当のスパムのうち見つけられた）', v: recall, show: pct(tp, SPAM.length) },
    { label: 'F値（適合率と再現率の調和平均）', v: f1, show: `${Math.round(f1 * 100)}%` },
    { label: '正解率（全体のうち当たり）', v: (tp + tn) / 20, show: pct(tp + tn, 20) },
  ]

  return (
    <div className="fig">
      <ul className="chart-legend">
        <li>
          <span className="tri-key" aria-hidden="true">▲</span>
          本当のスパム（8通）
        </li>
        <li>
          <span className="dot-key dot-key-train" aria-hidden="true" />
          普通のメール（12通）
        </li>
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} className="fig-svg" role="img" aria-label="スパムらしさの点数と判定ライン">
        <rect className="th-zone" x={sx(t)} y={14} width={sx(1) - sx(t) + 8} height={H - 40} />
        <text className="fig-tick" x={sx(1)} y={11} textAnchor="end">
          スパムと判定 →
        </text>
        <line className="fig-axis" x1={sx(0)} x2={sx(1)} y1={H - 22} y2={H - 22} />
        {[0, 0.5, 1].map((v) => (
          <text key={v} className="fig-tick" x={sx(v)} y={H - 8} textAnchor="middle">
            {v}
          </text>
        ))}
        {SPAM.map((s, i) => (
          <path
            key={`s${i}`}
            className={s >= t ? 'th-spam' : 'th-spam th-miss'}
            d={`M${sx(s)},${ROW_SPAM - 7} L${sx(s) + 7},${ROW_SPAM + 6} L${sx(s) - 7},${ROW_SPAM + 6} Z`}
          />
        ))}
        {HAM.map((s, i) => (
          <circle key={`h${i}`} className={s >= t ? 'th-ham th-false' : 'th-ham'} cx={sx(s)} cy={ROW_HAM} r={6} />
        ))}
        <line className="th-line" x1={sx(t)} x2={sx(t)} y1={14} y2={H - 22} />
      </svg>

      <label className="fig-slider">
        <span>
          判定ライン（この点数以上をスパムとする）<strong>{t.toFixed(2)}</strong>
        </span>
        <input type="range" min={0.05} max={0.95} step={0.05} value={t} onChange={(e) => setT(Math.round(Number(e.target.value) * 100) / 100)} />
      </label>

      <table className="th-matrix">
        <thead>
          <tr>
            <th />
            <th>スパムと判定</th>
            <th>普通と判定</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>本当はスパム</th>
            <td className="ok">{tp}（真陽性）</td>
            <td className="ng">{fn}（見逃し＝偽陰性）</td>
          </tr>
          <tr>
            <th>本当は普通</th>
            <td className="ng">{fp}（誤判定＝偽陽性）</td>
            <td className="ok">{tn}（真陰性）</td>
          </tr>
        </tbody>
      </table>

      <ul className="th-metrics" aria-live="polite">
        {metrics.map((m) => (
          <li key={m.label}>
            <span className="th-metric-label">{m.label}</span>
            <span className="fig-bar" aria-hidden="true">
              <span style={{ width: `${m.v * 100}%` }} />
            </span>
            <strong>{m.show}</strong>
          </li>
        ))}
      </ul>

      <p className="fig-note">
        ラインを左に動かす（判定を甘くする）と見逃しが減って再現率が上がるが、普通のメールまで巻き込んで適合率が下がる。右に動かすとその逆。両方を一度に100%にはできない。
      </p>
    </div>
  )
}
