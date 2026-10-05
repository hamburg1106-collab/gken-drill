import { useEffect, useState } from 'react'
import { EXAMS, EXAM_INFO_URL } from '../data/exams'
import { daysUntil, loadSlotId, pickSlot, saveSlotId, slotKey, upcomingExam } from '../lib/exam'

type Props = {
  /** 未解答と、間違えたままの問題の数。試験日までの1日あたりのペースを出すのに使う */
  remaining: number
}

export function Countdown({ remaining }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [savedId, setSavedId] = useState(() => loadSlotId())

  // 開いたまま日付をまたいでも数字が古くならないようにする
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const exam = upcomingExam(EXAMS, now)
  if (!exam) {
    return (
      <section className="countdown countdown-empty">
        <p>次回の試験日はまだ登録されていません。</p>
        <a href={EXAM_INFO_URL} target="_blank" rel="noreferrer">
          JDLAの試験日程を見る
        </a>
      </section>
    )
  }

  const slot = pickSlot(exam, savedId, now)
  const start = Date.parse(slot.start)
  const end = Date.parse(slot.end)
  const days = daysUntil(slot.start, now)
  const applyOpen = now < Date.parse(exam.applyDeadline)
  const applyDays = daysUntil(exam.applyDeadline, now)
  const perDay = days > 0 ? Math.ceil(remaining / days) : 0

  let main: string
  if (now >= end) main = 'おつかれさまでした'
  else if (now >= start) main = '試験中'
  else if (days === 0) main = '今日が試験日'
  else main = `あと ${days} 日`

  return (
    <section className="countdown" aria-label="試験日までのカウントダウン">
      <p className="cd-name">{exam.name}</p>
      <p className={`cd-main${days <= 7 && now < start ? ' cd-soon' : ''}`}>{main}</p>
      <p className="cd-date">{slot.label}・オンライン</p>

      {exam.slots.length > 1 && (
        <div className="cd-slots" role="group" aria-label="受験する日">
          {exam.slots.map((s) => {
            const key = slotKey(exam, s)
            return (
              <button
                key={key}
                className={s.id === slot.id ? 'active' : ''}
                aria-pressed={s.id === slot.id}
                onClick={() => {
                  saveSlotId(key)
                  setSavedId(key)
                }}
              >
                {s.label.replace(/〜.*$/, '')}
              </button>
            )
          })}
        </div>
      )}

      {applyOpen && (
        <p className={`cd-apply${applyDays <= 7 ? ' cd-soon' : ''}`}>
          申込締切 {exam.applyDeadlineLabel}
          {applyDays > 0 ? `（あと ${applyDays} 日）` : '（今日まで）'}
          {' ／ '}
          <a href={EXAM_INFO_URL} target="_blank" rel="noreferrer">
            申込ページ
          </a>
        </p>
      )}

      {days > 0 && remaining > 0 && (
        <p className="cd-pace">
          未解答・間違えたままの問題が {remaining} 問。<strong>1日 {perDay} 問</strong>で試験前に一周できる
        </p>
      )}
    </section>
  )
}
