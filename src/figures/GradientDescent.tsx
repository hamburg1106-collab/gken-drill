import { useEffect, useState } from 'react'

// 谷の形 f(x) = x² / 2。傾きは x なので、1歩の更新は x ← x − 学習率 × x になる。
// 学習率 < 1 ならまっすぐ谷底へ、1〜2 なら谷を飛び越えながら近づき、2 を超えると発散する。

const W = 340
const H = 210
const X_MIN = -4
const X_MAX = 4
const Y_MAX = 8
const START = -3.6

const sx = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * W
// 下端に「谷底」のラベルを置く分だけ、グラフを上に詰める
const sy = (y: number) => H - 26 - (y / Y_MAX) * (H - 36)
const f = (x: number) => (x * x) / 2

function verdict(lr: number): string {
  if (lr < 0.3) return '歩幅が小さすぎて、谷底に着くまで何歩もかかる'
  if (lr < 1) return 'ちょうどいい歩幅。まっすぐ谷底に近づく'
  if (lr === 1) return '一歩でぴったり谷底に着く（この形の谷だけの特別な値）'
  if (lr < 2) return '歩幅が大きく、谷を飛び越えて行ったり来たりしながら近づく'
  if (lr === 2) return '左右の同じ高さを往復するだけで、いつまでも谷底に着かない'
  return '歩幅が大きすぎて、往復するたびに外へ飛び出していく（発散）'
}

export function GradientDescent() {
  const [lr, setLr] = useState(0.2)
  const [path, setPath] = useState<number[]>([START])
  const [playing, setPlaying] = useState(false)

  const x = path[path.length - 1]!
  const out = Math.abs(x) > X_MAX

  function step() {
    setPath((p) => {
      const cur = p[p.length - 1]!
      if (Math.abs(cur) > X_MAX * 4) return p
      return [...p, cur - lr * cur]
    })
  }

  // 「自動で10歩」：0.35秒ごとに1歩
  useEffect(() => {
    if (!playing) return
    const id = setInterval(step, 350)
    const stop = setTimeout(() => setPlaying(false), 350 * 10 + 50)
    return () => {
      clearInterval(id)
      clearTimeout(stop)
    }
    // step は学習率を読むだけで、再生中に学習率は変わらない（変えると reset で止まる）
  }, [playing, lr])

  function reset(nextLr = lr) {
    setPlaying(false)
    setLr(nextLr)
    setPath([START])
  }

  const curve = Array.from({ length: 81 }, (_, i) => {
    const cx = X_MIN + (i / 80) * (X_MAX - X_MIN)
    return `${sx(cx)},${sy(f(cx))}`
  }).join(' ')
  const visible = path.filter((p) => Math.abs(p) <= X_MAX)

  return (
    <div className="fig">
      <svg viewBox={`0 0 ${W} ${H}`} className="fig-svg" role="img" aria-label="谷を下るボールの動き">
        <line className="fig-axis" x1={0} x2={W} y1={sy(0)} y2={sy(0)} />
        <polyline className="fig-curve" points={curve} />
        {/* 歩いた跡 */}
        {visible.slice(1).map((p, i) => {
          const prev = visible[i]!
          return (
            <line
              key={i}
              className="fig-step"
              x1={sx(prev)}
              y1={sy(f(prev))}
              x2={sx(p)}
              y2={sy(f(p))}
            />
          )
        })}
        {visible.slice(0, -1).map((p, i) => (
          <circle key={i} className="fig-trail" cx={sx(p)} cy={sy(f(p))} r={3} />
        ))}
        {!out && <circle className="fig-ball" cx={sx(x)} cy={sy(f(x))} r={8} />}
        <text className="fig-label" x={sx(0)} y={H - 8} textAnchor="middle">
          谷底（損失が最小）
        </text>
      </svg>

      <p className="fig-readout" aria-live="polite">
        {path.length - 1}歩目・{out ? '画面の外へ飛び出した（発散）' : `谷底まであと ${Math.abs(x).toFixed(2)}`}
        <br />
        <strong>{verdict(lr)}</strong>
      </p>

      <label className="fig-slider">
        <span>
          学習率（1歩の大きさ）<strong>{lr.toFixed(2)}</strong>
        </span>
        <input
          type="range"
          min={0.05}
          max={2.2}
          step={0.05}
          value={lr}
          onChange={(e) => reset(Number(e.target.value))}
        />
      </label>
      <div className="fig-presets">
        {[0.1, 0.5, 1.5, 2.1].map((v) => (
          <button key={v} className={lr === v ? 'on' : ''} onClick={() => reset(v)}>
            {v}
          </button>
        ))}
      </div>

      <div className="fig-buttons">
        <button className="btn" onClick={step} disabled={playing}>
          1歩進む
        </button>
        <button className="btn btn-primary" onClick={() => setPlaying(true)} disabled={playing}>
          自動で10歩
        </button>
        <button className="btn btn-ghost" onClick={() => reset()}>
          最初から
        </button>
      </div>

      <p className="fig-note">
        ボールは「今いる場所の坂の向き」だけを頼りに、学習率の分だけ下へ動く。これが勾配降下法。学習率を変えて、0.1・0.5・1.5・2.1
        を比べてみよう。
      </p>
    </div>
  )
}
