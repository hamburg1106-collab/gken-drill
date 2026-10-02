import { CATEGORIES } from '../data'
import { TERM_MAPS } from '../data/maps'

type Props = {
  onOpen: (id: string) => void
  onBack: () => void
}

export function MapList({ onOpen, onBack }: Props) {
  return (
    <div className="screen maps">
      <header className="sub-head">
        <button className="back" onClick={onBack} aria-label="ホームに戻る">
          ←
        </button>
        <h1>用語マップ</h1>
      </header>
      <p className="lede">用語どうしのつながりを図で確認する。用語をタップすると説明と関連問題が出る。</p>

      {CATEGORIES.map((c) => {
        const maps = TERM_MAPS.filter((m) => m.category === c.id)
        if (maps.length === 0) return null
        return (
          <section key={c.id} className="categories">
            <h2>{c.label}</h2>
            {maps.map((m) => (
              <button key={m.id} className="row" onClick={() => onOpen(m.id)}>
                <span className="row-main">
                  <span className="row-title">{m.title}</span>
                  <span className="row-sub">
                    {m.summary} ／ 用語{m.nodes.length}個
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
