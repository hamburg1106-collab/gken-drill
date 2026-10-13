// ⚠要確認の問題を、本人が公式テキストと照らし合わせて「確認済み」にした記録。
// 問題ごとの正誤（progress）とは別に持ち、学習記録のリセットでは消さない。

const KEY = 'gken-drill/checked/v1'

export function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [])
  } catch {
    return new Set()
  }
}

export function toggleChecked(checked: Set<string>, id: string): Set<string> {
  const next = new Set(checked)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    // 保存できなくても画面上の状態は切り替える
  }
  return next
}
