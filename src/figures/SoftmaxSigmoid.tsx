import { useState } from 'react'

// 同じ3つのスコア（出力層に入る前の値）を、ソフトマックスとシグモイドに通して比べる。
// ソフトマックスは合計100%の取り合い、シグモイドはラベルごとに独立した「はい・いいえ」の確率。

const LABELS = ['犬', '猫', '鳥'] as const
const PRESETS: { label: string; scores: number[] }[] = [
  { label: '犬が目立つ', scores: [3, 0.5, -1] },
  { label: '犬と猫が同じくらい', scores: [2, 2, -1] },
  { label: '全部低い', scores: [-2, -1.5, -2.5] },
]

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
function softmax(xs: number[]): number[] {
  const m = Math.max(...xs)
  const e = xs.map((x) => Math.exp(x - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / s)
}
const pct = (v: number) => `${Math.round(v * 100)}%`

export function SoftmaxSigmoid() {
  const [scores, setScores] = useState<number[]>(PRESETS[0]!.scores)
  const soft = softmax(scores)
  const sig = scores.map(sigmoid)
  const top = soft.indexOf(Math.max(...soft))
  const sigSum = sig.reduce((a, b) => a + b, 0)

  return (
    <div className="fig">
      <div className="fig-presets">
        {PRESETS.map((p) => (
          <button key={p.label} className={scores.join() === p.scores.join() ? 'on' : ''} onClick={() => setScores(p.scores)}>
            {p.label}
          </button>
        ))}
      </div>

      {LABELS.map((l, i) => (
        <label key={l} className="fig-slider">
          <span>
            「{l}」のスコア <strong>{scores[i]!.toFixed(1)}</strong>
          </span>
          <input
            type="range"
            min={-4}
            max={4}
            step={0.5}
            value={scores[i]}
            onChange={(e) => setScores((s) => s.map((v, j) => (j === i ? Number(e.target.value) : v)))}
          />
        </label>
      ))}

      <div className="sm-panels" aria-live="polite">
        <section className="sm-panel">
          <h3 className="fig-sub">ソフトマックス（どれか1つ）</h3>
          {LABELS.map((l, i) => (
            <div key={l} className="sm-row">
              <span className="sm-label">{l}</span>
              <span className="fig-bar" aria-hidden="true">
                <span style={{ width: `${soft[i]! * 100}%` }} />
              </span>
              <strong>{pct(soft[i]!)}</strong>
            </div>
          ))}
          <p className="fig-note">
            合計は必ず100%。答えは一番高い「<strong>{LABELS[top]}</strong>」。1つが上がると、ほかは下がる。
          </p>
        </section>

        <section className="sm-panel">
          <h3 className="fig-sub">シグモイド（それぞれ はい・いいえ）</h3>
          {LABELS.map((l, i) => (
            <div key={l} className="sm-row">
              <span className="sm-label">{l}</span>
              <span className="fig-bar fig-bar-alt" aria-hidden="true">
                <span style={{ width: `${sig[i]! * 100}%` }} />
              </span>
              <strong>
                {pct(sig[i]!)} {sig[i]! >= 0.5 ? 'はい' : 'いいえ'}
              </strong>
            </div>
          ))}
          <p className="fig-note">
            合計は {pct(sigSum)}（100%にそろわない）。「犬も猫も写っている」「どれも写っていない」も表せる。
          </p>
        </section>
      </div>

      <p className="fig-note">
        「犬と猫が同じくらい」を押すと違いがよく分かる。ソフトマックスはほぼ半分ずつに分け合うが、シグモイドはどちらも「はい」と答えられる。1枚に複数のラベルが付くマルチラベル分類でシグモイドを使うのはこのため。
      </p>
    </div>
  )
}
