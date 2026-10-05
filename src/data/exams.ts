// G検定の試験日程。JDLA公式（https://www.jdla.org/certificate/general/）の掲載内容を手で写している。
// 新しい回の日程が発表されたら、ここに追記する。日時はすべて日本時間。

export type ExamSlot = {
  id: string
  /** 画面に出す日時 */
  label: string
  start: string
  end: string
}

export type Exam = {
  id: string
  name: string
  /** 個人申込の締切（団体申込はこれより早い） */
  applyDeadline: string
  applyDeadlineLabel: string
  /** オンライン試験は複数の枠から1つを選んで受ける回がある */
  slots: ExamSlot[]
}

export const EXAM_INFO_URL = 'https://www.jdla.org/certificate/general/'

export const EXAMS: Exam[] = [
  {
    id: 'G2026#6',
    name: '2026年 第6回 G検定',
    applyDeadline: '2026-10-29T23:59:00+09:00',
    applyDeadlineLabel: '10月29日（木）23:59',
    slots: [
      {
        id: 'fri',
        label: '11月6日（金）16:00〜17:40',
        start: '2026-11-06T16:00:00+09:00',
        end: '2026-11-06T17:40:00+09:00',
      },
      {
        id: 'sat',
        label: '11月7日（土）13:00〜14:40',
        start: '2026-11-07T13:00:00+09:00',
        end: '2026-11-07T14:40:00+09:00',
      },
    ],
  },
]
