import { CATEGORIES } from '../data'
import { FIGURES } from '../figures'

type Props = {
  onOpen: (id: string) => void
  onBack: () => void
}

export function FigureList({ onOpen, onBack }: Props) {
  return (
    <div className="screen maps">
      <header className="sub-head">
        <button className="back" onClick={onBack} aria-label="ホームに戻る">
          ←
        </button>
        <h1>動く図解</h1>
      </header>
      <p className="lede">技術的な仕組みを、指で動かして確かめる。関係する問題の解説からも開ける。</p>

      {CATEGORIES.map((c) => {
        const figs = FIGURES.filter((f) => f.category === c.id)
        if (figs.length === 0) return null
        return (
          <section key={c.id} className="categories">
            <h2>{c.label}</h2>
            {figs.map((f) => (
              <button key={f.id} className="row" onClick={() => onOpen(f.id)}>
                <span className="row-main">
                  <span className="row-title">{f.title}</span>
                  <span className="row-sub">
                    {f.summary} ／ 関係する問題{f.questionIds.length}問
                  </span>
                </span>
              </button>
            ))}
          </section>
        )
      })}
    </div>
  )
}
