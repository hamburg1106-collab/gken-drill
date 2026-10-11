import { useState } from 'react'

// 単語をタップすると、その単語が文中のどの単語に「注意を向けるか」を濃さで見せる。
// 重みは仕組みを説明するために手で決めた値で、実際のモデルが出す値ではない。

const TOKENS = ['猫', 'が', '魚', 'を', '食べた', '。', 'それ', 'は', '満腹', 'に', 'なった']

/** 単語ごとの注意の向け先（手で決めた説明用の値）。書いていない単語には少しだけ配る */
const RAW: Record<string, Record<string, number>> = {
  猫: { 猫: 0.4, 食べた: 0.3, が: 0.15, それ: 0.1 },
  魚: { 魚: 0.4, 食べた: 0.3, を: 0.2, 猫: 0.05 },
  食べた: { 猫: 0.35, 魚: 0.35, 食べた: 0.15, を: 0.05, が: 0.05 },
  それ: { 猫: 0.5, 魚: 0.25, 食べた: 0.1, それ: 0.1 },
  満腹: { 猫: 0.4, 食べた: 0.25, それ: 0.15, 満腹: 0.1, なった: 0.05 },
  なった: { 満腹: 0.4, それ: 0.3, 猫: 0.15, なった: 0.1 },
}

const EXPLAIN: Record<string, string> = {
  それ: '「それ」が何を指すかを決めるため、文の前の方の「猫」に一番強く注意を向ける。2番目は「魚」。',
  食べた: '「食べた」は、誰が（猫）何を（魚）食べたのかを知るために、両方へ同じくらい注意を向ける。',
  満腹: '「満腹」になったのは誰か。食べた側の「猫」と、「食べた」という出来事に注意を向ける。',
  なった: '「なった」は、何に（満腹）なったのか、誰が（それ＝猫）なったのかを見る。',
  猫: '「猫」は、自分が何をしたか（食べた）と、後で自分を指す「それ」に注意を向ける。',
  魚: '「魚」は、自分がどうされたか（食べた）と、目的語のしるし「を」に注意を向ける。',
}

function weightsOf(i: number): number[] {
  const word = TOKENS[i]!
  const raw = RAW[word]
  const w = TOKENS.map((t, j) => {
    if (raw) return (raw[t] ?? 0) + 0.01
    // 助詞や句点は、自分と前後の単語を見るだけ
    return j === i ? 0.4 : Math.abs(j - i) === 1 ? 0.3 : 0.01
  })
  const s = w.reduce((a, b) => a + b, 0)
  return w.map((v) => v / s)
}

export function Attention() {
  const [sel, setSel] = useState(6)
  const [showPos, setShowPos] = useState(false)
  const w = weightsOf(sel)
  const ranked = w
    .map((v, i) => ({ v, i }))
    .filter((x) => x.i !== sel)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)

  return (
    <div className="fig">
      <p className="fig-note">単語をタップすると、その単語がどの単語に注目しているかが濃さで出る。</p>
      <div className="attn-tokens" role="group" aria-label="文の単語">
        {TOKENS.map((t, i) => (
          <button
            key={i}
            className={`attn-token${i === sel ? ' sel' : ''}`}
            style={i === sel ? undefined : { background: `rgb(217 89 38 / ${Math.min(0.9, w[i]! * 1.8)})` }}
            aria-pressed={i === sel}
            onClick={() => setSel(i)}
          >
            {showPos && <span className="attn-pos">{i + 1}</span>}
            {t}
          </button>
        ))}
      </div>

      <div className="fig-readout" aria-live="polite">
        「{TOKENS[sel]}」が注目している単語
        <ul className="attn-rank">
          {ranked.map(({ v, i }) => (
            <li key={i}>
              <span className="sm-label">{TOKENS[i]}</span>
              <span className="fig-bar fig-bar-alt" aria-hidden="true">
                <span style={{ width: `${v * 100}%` }} />
              </span>
              <strong>{Math.round(v * 100)}%</strong>
            </li>
          ))}
        </ul>
        {EXPLAIN[TOKENS[sel]!] && <p className="fig-note">{EXPLAIN[TOKENS[sel]!]}</p>}
      </div>

      <div className="fig-buttons">
        <button className="btn" onClick={() => setShowPos((v) => !v)}>
          {showPos ? '番号札を隠す' : '位置の番号札を見る'}
        </button>
      </div>
      {showPos && (
        <p className="fig-note">
          Transformerは全部の単語を一度に見比べるので、そのままでは語順が分からない（「猫が魚を食べた」と「魚が猫を食べた」が同じ単語の集まりになる）。そこで各単語に「何番目か」の番号札を足して渡す。これが位置エンコーディング。
        </p>
      )}

      <p className="fig-note">
        ※濃さは仕組みを説明するために決めた値で、実際のモデルの数値ではない。実際のSelf-Attentionでは、各単語のQuery（何を探しているか）と他の単語のKey（何を持っているか）の近さからこの重みを計算し、その重みで各単語のValue（中身）を混ぜ合わせる。
      </p>
    </div>
  )
}
