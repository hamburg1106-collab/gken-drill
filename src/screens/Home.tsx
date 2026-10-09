import { ALL_QUESTIONS, CATEGORIES } from '../data'
import { TERM_MAPS } from '../data/maps'
import { Countdown } from './Countdown'
import type { Progress } from '../lib/storage'
import { accuracyOf, unsureIds, wrongIds } from '../lib/storage'
import type { Source } from '../lib/source'
import type { StudyLog } from '../lib/studyLog'
import { formatDuration, todayOf } from '../lib/studyLog'

type Props = {
  progress: Progress
  log: StudyLog
  onStart: (source: Source) => void
  onOpenLog: () => void
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

export function Home({ progress, log, onStart, onOpenLog, onOpenMaps, onReset }: Props) {
  const allIds = ALL_QUESTIONS.map((q) => q.id)
  const total = accuracyOf(progress, allIds)
  const wrong = wrongIds(progress)
  const unsure = unsureIds(progress)
  const review = wrong.length + unsure.length
  const today = todayOf(log)

  return (
    <div className="screen home">
      <header className="home-head">
        <h1>G検定 1問1答</h1>
        <p className="lede">
          全{ALL_QUESTIONS.length}問 ／ 解答済み {total.answered}問 ／ 直近正解 {total.correct}問
        </p>
        <Bar answered={total.answered} correct={total.correct} total={ALL_QUESTIONS.length} />
      </header>

      <Countdown remaining={ALL_QUESTIONS.length - total.answered + review} />

      <section className="menu">
        <button className="card card-primary" onClick={() => onStart({ kind: 'all' })}>
          <span className="card-title">全分野ランダム</span>
          <span className="card-sub">10問 ／ 未出題の問題から優先して出す</span>
        </button>

        <button
          className="card card-wrong"
          disabled={review === 0}
          onClick={() => onStart({ kind: 'wrong' })}
        >
          <span className="card-title">間違えた・自信なしの問題</span>
          <span className="card-sub">
            {review === 0
              ? '対象なし（自信を持って正解すればリストから外れます）'
              : `間違い ${wrong.length}問 ／ 自信なし ${unsure.length}問`}
          </span>
        </button>

        <button className="card card-log" onClick={onOpenLog}>
          <span className="card-title">学習の記録</span>
          <span className="card-sub">
            {today
              ? `今日 ${today.answers}問・${formatDuration(today.studyMs)} ／ ${log.length}日目`
              : log.length === 0
                ? '解くと日ごとの記録が自動で残ります'
                : `今日はまだ ／ これまで ${log.length}日`}
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
            if (confirm('問題ごとの正誤の記録をすべて消します（日ごとの学習の記録は残ります）。よろしいですか？'))
              onReset()
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
