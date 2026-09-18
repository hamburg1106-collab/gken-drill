const KEY = 'gken-drill/progress/v1'

export type Stat = {
  /** 通算の正解回数 */
  correct: number
  /** 通算の不正解回数 */
  wrong: number
  /** 直近の解答が不正解だったか。「間違えた問題」モードの対象判定に使う */
  lastWrong: boolean
}

export type Progress = Record<string, Stat>

const EMPTY: Stat = { correct: 0, wrong: 0, lastWrong: false }

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as Progress
  } catch {
    // プライベートブラウジングなどで読めなくても学習自体は続けられるようにする
    return {}
  }
}

function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // 保存できなくても解答は継続させる
  }
}

export function statOf(progress: Progress, id: string): Stat {
  return progress[id] ?? EMPTY
}

export function recordAnswer(progress: Progress, id: string, correct: boolean): Progress {
  const prev = statOf(progress, id)
  const next: Progress = {
    ...progress,
    [id]: {
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
      lastWrong: !correct,
    },
  }
  saveProgress(next)
  return next
}

export function resetProgress(): Progress {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 消せなくても画面上の状態は初期化する
  }
  return {}
}

/** 直近で間違えたままの問題ID */
export function wrongIds(progress: Progress): string[] {
  return Object.keys(progress).filter((id) => progress[id]?.lastWrong)
}

export type Accuracy = {
  /** 一度でも解いた問題数 */
  answered: number
  /** 直近の解答が正解だった問題数 */
  correct: number
}

/** 「直近の解答が正解か」を問題単位で集計する。回した回数ではなく到達度を見るため */
export function accuracyOf(progress: Progress, ids: string[]): Accuracy {
  let answered = 0
  let correct = 0
  for (const id of ids) {
    const stat = progress[id]
    if (!stat || stat.correct + stat.wrong === 0) continue
    answered += 1
    if (!stat.lastWrong) correct += 1
  }
  return { answered, correct }
}
