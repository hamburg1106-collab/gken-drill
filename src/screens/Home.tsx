import { ALL_QUESTIONS, CATEGORIES } from '../data'
import { TERM_MAPS } from '../data/maps'
import { Countdown } from './Countdown'
import type { Progress } from '../lib/storage'
import { accuracyOf, wrongIds } from '../lib/storage'
import type { Source } from '../lib/source'

type Props = {
  progress: Progress
  onStart: (source: Source) => void
  onOpenMaps: () => void
  onReset: () => void
}

function Bar({ answered, correct, total }: { answered: number; correct: number; total: number }) {
  const correctPct = total === 0 ? 0 : (correct / total) * 100
  const answeredPct = total === 0 ? 0 : (answered / total) * 100
  return (
    <div className="bar" aria-hidden="true">
      <div className="bar-answered" style={{ width: `${answeredPct}%` }} />
      <div className="bar-correct" style={{ width: `${correctPct}%` }} />
    </div>
  )
}

export function Home({ progress, onStart, onOpenMaps, onReset }: Props) {
  const allIds = ALL_QUESTIONS.map((q) => q.id)
  const total = accuracyOf(progress, allIds)
  const wrong = wrongIds(progress)

  return (
    <div className="screen home">
      <header className="home-head">
        <h1>G検定 1問1答</h1>
        <p className="lede">
          全{ALL_QUESTIONS.length}問 ／ 解答済み {total.answered}問 ／ 直近正解 {total.correct}問
        </p>
        <Bar answered={total.answered} correct={total.correct} total={ALL_QUESTIONS.length} />
      </header>

      <Countdown remaining={ALL_QUESTIONS.length - total.answered + wrong.length} />

      <section className="menu">
        <button className="card card-primary" onClick={() => onStart({ kind: 'all' })}>
          <span className="card-title">全分野ランダム</span>
          <span className="card-sub">10問 ／ 未出題の問題から優先して出す</span>
        </button>

        <button
          className="card card-wrong"
          disabled={wrong.length === 0}
          onClick={() => onStart({ kind: 'wrong' })}
        >
          <span className="card-title">間違えた問題だけ</span>
          <span className="card-sub">
            {wrong.length === 0 ? '対象なし（正解すればリストから外れます）' : `${wrong.length}問`}
          </span>
        </button>

        <button className="card card-map" onClick={onOpenMaps}>
          <span className="card-title">用語マップ</span>
          <span className="card-sub">{TERM_MAPS.length}枚の図で、用語どうしのつながりを確認する</span>
        </button>
      </section>

      <section className="categories">
        <h2>分野別</h2>
        {CATEGORIES.map((c) => {
          const ids = ALL_QUESTIONS.filter((q) => q.category === c.id).map((q) => q.id)
          const acc = accuracyOf(progress, ids)
          return (
            <button key={c.id} className="row" onClick={() => onStart({ kind: 'category', id: c.id })}>
              <span className="row-main">
                <span className="row-title">{c.label}</span>
                <span className="row-sub">
                  {ids.length}問中 {acc.answered}問解答 ／ 正解 {acc.correct}問
                </span>
              </span>
              <Bar answered={acc.answered} correct={acc.correct} total={ids.length} />
            </button>
          )
        })}
      </section>

      <footer className="home-foot">
        <button
          className="link-danger"
          onClick={() => {
            if (confirm('解答の記録をすべて消します。よろしいですか？')) onReset()
          }}
        >
          学習記録をリセット
        </button>
        <p className="note">
          記録はこの端末のブラウザ内にのみ保存されます。⚠印の問題は年号・数値・法令など、公式テキストとの照合を推奨します。
        </p>
      </footer>
    </div>
  )
}
