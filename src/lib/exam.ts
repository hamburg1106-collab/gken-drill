import type { Exam, ExamSlot } from '../data/exams'

const DAY = 24 * 60 * 60 * 1000
const JST = 9 * 60 * 60 * 1000
const SLOT_KEY = 'gken-drill/exam-slot/v1'

/** 日本時間での通し日数。「あと何日」を時刻ではなく暦の日付で数えるため */
function jstDay(ms: number): number {
  return Math.floor((ms + JST) / DAY)
}

export function daysUntil(iso: string, now: number): number {
  return jstDay(Date.parse(iso)) - jstDay(now)
}

/** まだ全枠が終わっていない、いちばん近い回 */
export function upcomingExam(exams: Exam[], now: number): Exam | undefined {
  return exams.find((e) => e.slots.some((s) => Date.parse(s.end) > now))
}

export function loadSlotId(): string | null {
  try {
    return localStorage.getItem(SLOT_KEY)
  } catch {
    return null
  }
}

export function saveSlotId(id: string): void {
  try {
    localStorage.setItem(SLOT_KEY, id)
  } catch {
    // 保存できなくても表示は切り替える
  }
}

/** 保存用のキー。回をまたいで同じ枠IDが出ても取り違えないよう、回のIDを含める */
export function slotKey(exam: Exam, slot: ExamSlot): string {
  return `${exam.id}/${slot.id}`
}

/** 選んだ枠。未選択（または別の回の枠）なら、まだ終わっていない最初の枠 */
export function pickSlot(exam: Exam, savedId: string | null, now: number): ExamSlot {
  const saved = exam.slots.find((s) => slotKey(exam, s) === savedId)
  if (saved) return saved
  return exam.slots.find((s) => Date.parse(s.end) > now) ?? exam.slots[exam.slots.length - 1]!
}
