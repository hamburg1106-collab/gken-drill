import type { Figure } from '../figures'
import { useBackHandler } from '../lib/backButton'

type Props = {
  figure: Figure
  onBack: () => void
  backLabel: string
  /** 省略すると「この図の問題を解く」を出さない（問題を解いている途中で開いた場合） */
  onQuiz?: () => void
}

/** 図解1つ分の画面。ホームから開く全画面版と、問題の上に重ねる版で共用する */
export function FigureView({ figure, onBack, backLabel, onQuiz }: Props) {
  const { Component } = figure
  return (
    <div className="screen figure-view">
      <header className="sub-head">
        <button className="back" onClick={onBack} aria-label={backLabel}>
          ←
        </button>
        <h1>{figure.title}</h1>
      </header>
      <p className="lede">{figure.summary}</p>
      <Component />
      {onQuiz && (
        <button className="btn btn-primary fig-quiz" onClick={onQuiz}>
          この図に関係する問題を解く（{figure.questionIds.length}問）
        </button>
      )}
    </div>
  )
}

/** 問題を解いている途中で開く図解。閉じると、解いていた問題にそのまま戻る */
export function FigureOverlay({ figure, onClose }: { figure: Figure; onClose: () => void }) {
  useBackHandler(true, onClose)
  return (
    <div className="fig-overlay" role="dialog" aria-label={`${figure.title}の図解`}>
      <FigureView figure={figure} onBack={onClose} backLabel="問題に戻る" />
    </div>
  )
}
