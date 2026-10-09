const KEY = 'gken-drill/progress/v1'

export type Stat = {
  /** 通算の正解回数 */
  correct: number
  /** 通算の不正解回数 */
  wrong: number
  /** 直近の解答が不正解だったか。「間違えた問題」モードの対象判定に使う */
  lastWrong: boolean
  /** 直近の解答は正解だが「勘だった（自信なし）」と付けたか。復習の対象に含める。v1の記録には無い */
  lastUnsure?: boolean
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
      // 解き直すたびに付け直す。自信を持って正解すれば復習の対象から外れる
      lastUnsure: false,
    },
  }
  saveProgress(next)
  return next
}

/** 直近の正解に「自信なし」を付ける・外す。不正解の問題には付けない */
export function markUnsure(progress: Progress, id: string, unsure: boolean): Progress {
  const prev = progress[id]
  if (!prev || prev.lastWrong) return progress
  const next: Progress = { ...progress, [id]: { ...prev, lastUnsure: unsure } }
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

/** 直近の正解に「自信なし」が付いている問題ID */
export function unsureIds(progress: Progress): string[] {
  return Object.keys(progress).filter((id) => {
    const s = progress[id]
    return !!s && !s.lastWrong && !!s.lastUnsure
  })
}

/** 復習の対象（間違えたまま＋自信なし） */
export function reviewIds(progress: Progress): string[] {
  return [...wrongIds(progress), ...unsureIds(progress)]
}

export type Accuracy = {
  /** 一度でも解いた問題数 */
  answered: number
  /** 直近の解答が正解だった問題数（自信なしを含む） */
  correct: number
  /** correct のうち「自信なし」が付いている問題数。v1の記録には無い */
  unsure?: number
}

/** 「直近の解答が正解か」を問題単位で集計する。回した回数ではなく到達度を見るため */
export function accuracyOf(progress: Progress, ids: string[]): Accuracy {
  let answered = 0
  let correct = 0
  let unsure = 0
  for (const id of ids) {
    const stat = progress[id]
    if (!stat || stat.correct + stat.wrong === 0) continue
    answered += 1
    if (!stat.lastWrong) {
      correct += 1
      if (stat.lastUnsure) unsure += 1
    }
  }
  return { answered, correct, unsure }
}
