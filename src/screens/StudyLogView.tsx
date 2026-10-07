import { useEffect, useRef, useState } from 'react'
import { ALL_QUESTIONS } from '../data'
import type { StudyLog } from '../lib/studyLog'
import { dateKey, formatDuration, shortDate, toCsv, toMarkdown } from '../lib/studyLog'

type Props = {
  log: StudyLog
  onBack: () => void
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 日付の差（日数）。端末の時刻での暦日で数える */
function dayIndex(date: string, origin: string): number {
  const [y1, m1, d1] = date.split('-').map(Number)
  const [y0, m0, d0] = origin.split('-').map(Number)
  return Math.round((Date.UTC(y1!, m1! - 1, d1!) - Date.UTC(y0!, m0! - 1, d0!)) / DAY_MS)
}

/** 親要素の幅に合わせて描くため、幅を測る */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

const PAD = { top: 12, right: 12, bottom: 24, left: 36 }
/** 両端の棒が軸や枠にかからないよう、最初と最後の日を内側に寄せる幅 */
const EDGE = 14

type ChartProps = {
  log: StudyLog
  selected: number
  onSelect: (i: number) => void
}

/** 横軸（日付）の共通計算。勉強しなかった日も間隔として残す */
function useXScale(log: StudyLog, width: number) {
  const origin = log[0]!.date
  const span = Math.max(1, dayIndex(log[log.length - 1]!.date, origin))
  const innerW = Math.max(0, width - PAD.left - PAD.right - EDGE * 2)
  // 1日だけのときは中央に置く
  const x = (date: string) =>
    log.length === 1 ? PAD.left + EDGE + innerW / 2 : PAD.left + EDGE + (dayIndex(date, origin) / span) * innerW
  return { x, innerW, span }
}

/** ポインタの位置から一番近い日を選ぶ */
function nearest(log: StudyLog, x: (date: string) => number, px: number): number {
  let best = 0
  let bestDist = Infinity
  log.forEach((d, i) => {
    const dist = Math.abs(x(d.date) - px)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  })
  return best
}

function XLabels({ log, x, height }: { log: StudyLog; x: (date: string) => number; height: number }) {
  const first = log[0]!
  const last = log[log.length - 1]!
  const labels = log.length === 1 ? [first] : [first, last]
  return (
    <>
      {labels.map((d, i) => (
        <text
          key={d.date}
          className="chart-axis"
          x={x(d.date)}
          y={height - 6}
          textAnchor={log.length === 1 ? 'middle' : i === 0 ? 'start' : 'end'}
        >
          {shortDate(d.date)}
        </text>
      ))}
    </>
  )
}

function ReachChart({ log, selected, onSelect }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const height = 170
  const total = ALL_QUESTIONS.length
  const innerH = height - PAD.top - PAD.bottom
  const { x } = useXScale(log, width)
  const y = (pct: number) => PAD.top + innerH * (1 - pct / 100)
  const pctOf = (i: number) => (log[i]!.reach.correct / total) * 100
  const points = log.map((d, i) => `${x(d.date)},${y(pctOf(i))}`).join(' ')
  const sel = log[selected]!

  return (
    <div ref={ref} className="chart">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="到達度の推移"
          onPointerDown={(e) => onSelect(nearest(log, x, e.nativeEvent.offsetX))}
          onPointerMove={(e) => onSelect(nearest(log, x, e.nativeEvent.offsetX))}
        >
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} />
              <text className="chart-axis" x={PAD.left - 6} y={y(v) + 4} textAnchor="end">
                {v}%
              </text>
            </g>
          ))}
          <line className="chart-cross" x1={x(sel.date)} x2={x(sel.date)} y1={PAD.top} y2={PAD.top + innerH} />
          {log.length > 1 && <polyline className="chart-line" points={points} />}
          {log.map((d, i) => (
            <circle
              key={d.date}
              className={i === selected ? 'chart-dot chart-dot-sel' : 'chart-dot'}
              cx={x(d.date)}
              cy={y(pctOf(i))}
              r={i === selected ? 5 : 4}
            />
          ))}
          <XLabels log={log} x={x} height={height} />
        </svg>
      )}
    </div>
  )
}

/** 上の角だけ丸めた棒 */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

function AnswersChart({ log, selected, onSelect }: ChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const height = 150
  const innerH = height - PAD.top - PAD.bottom
  const { x, innerW, span } = useXScale(log, width)
  const max = Math.max(10, ...log.map((d) => d.answers))
  // 目盛りは切りのいい数に
  const step = max <= 20 ? 10 : max <= 50 ? 25 : max <= 100 ? 50 : 100
  const top = Math.ceil(max / step) * step
  const y = (v: number) => PAD.top + innerH * (1 - v / top)
  const slot = log.length === 1 ? innerW : innerW / (span + 1)
  const barW = Math.max(3, Math.min(EDGE * 2, slot - 2))

  return (
    <div ref={ref} className="chart">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="1日に解いた数"
          onPointerDown={(e) => onSelect(nearest(log, x, e.nativeEvent.offsetX))}
          onPointerMove={(e) => onSelect(nearest(log, x, e.nativeEvent.offsetX))}
        >
          {[0, top / 2, top].map((v) => (
            <g key={v}>
              <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} />
              <text className="chart-axis" x={PAD.left - 6} y={y(v) + 4} textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {log.map((d, i) => {
            const h = y(0) - y(d.answers)
            return (
              <path
                key={d.date}
                className={i === selected ? 'chart-bar chart-bar-sel' : 'chart-bar'}
                d={barPath(x(d.date) - barW / 2, y(d.answers), barW, h)}
              />
            )
          })}
          <XLabels log={log} x={x} height={height} />
        </svg>
      )}
    </div>
  )
}

function download(filename: string, text: string) {
  // Excelで文字化けしないようにBOMを付ける
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function StudyLogView({ log, onBack }: Props) {
  const [selected, setSelected] = useState(log.length - 1)
  const [copied, setCopied] = useState(false)
  const total = ALL_QUESTIONS.length

  const head = (
    <header className="sub-head">
      <button className="back" onClick={onBack} aria-label="ホームに戻る">
        ←
      </button>
      <h1>学習の記録</h1>
    </header>
  )

  if (log.length === 0) {
    return (
      <div className="screen study-log">
        {head}
        <p className="lede">まだ記録がありません。問題を解くと、日ごとの記録が自動で残ります。</p>
      </div>
    )
  }

  const sel = log[Math.min(selected, log.length - 1)]!
  const latest = log[log.length - 1]!
  const totalMs = log.reduce((s, d) => s + d.studyMs, 0)
  const totalAnswers = log.reduce((s, d) => s + d.answers, 0)
  const first = log[0]!
  const reachPct = (d: (typeof log)[number]) => Math.round((d.reach.correct / total) * 100)

  async function copy() {
    try {
      await navigator.clipboard.writeText(toMarkdown(log))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('コピーできませんでした')
    }
  }

  return (
    <div className="screen study-log">
      {head}
      <p className="lede">問題を解くたびに自動で記録されます。グラフをタップすると、その日の数字が出ます。</p>

      <section className="tiles">
        <div className="tile">
          <span className="tile-label">勉強した日</span>
          <span className="tile-value">{log.length}日</span>
        </div>
        <div className="tile">
          <span className="tile-label">勉強時間（目安）</span>
          <span className="tile-value">{formatDuration(totalMs)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">解いた数</span>
          <span className="tile-value">{totalAnswers}問</span>
        </div>
        <div className="tile">
          <span className="tile-label">到達度</span>
          <span className="tile-value">
            {reachPct(first)}% → {reachPct(latest)}%
          </span>
        </div>
      </section>

      <p className="readout" aria-live="polite">
        <strong>{shortDate(sel.date)}</strong>
        {sel.date === dateKey(Date.now()) && '（今日）'}　到達度 {reachPct(sel)}%（{sel.reach.correct}/{total}問）・
        {sel.answers}問・正解率 {Math.round((sel.correct / sel.answers) * 100)}%・{formatDuration(sel.studyMs)}
      </p>

      <h2 className="chart-title">到達度の推移</h2>
      <p className="chart-sub">全{total}問のうち、直近の解答が正解の問題の割合</p>
      <ReachChart log={log} selected={selected} onSelect={setSelected} />

      <h2 className="chart-title">1日に解いた数</h2>
      <AnswersChart log={log} selected={selected} onSelect={setSelected} />

      <h2 className="chart-title">日ごとの記録</h2>
      <div className="log-table-wrap">
        <table className="log-table">
          <thead>
            <tr>
              <th>日付</th>
              <th>時間</th>
              <th>解いた数</th>
              <th>正解率</th>
              <th>到達度</th>
            </tr>
          </thead>
          <tbody>
            {[...log].reverse().map((d) => {
              const i = log.indexOf(d)
              return (
                <tr key={d.date} className={i === selected ? 'sel' : ''} onClick={() => setSelected(i)}>
                  <td>{shortDate(d.date)}</td>
                  <td>{formatDuration(d.studyMs)}</td>
                  <td>{d.answers}</td>
                  <td>{Math.round((d.correct / d.answers) * 100)}%</td>
                  <td>{reachPct(d)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="actions">
        <button className="btn" onClick={copy}>
          {copied ? 'コピーしました' : '表をコピー（記録.md に貼る用）'}
        </button>
        <button className="btn" onClick={() => download(`gken-log-${dateKey(Date.now())}.csv`, toCsv(log))}>
          CSVで保存（分野別の到達度つき）
        </button>
      </div>

      <p className="note">
        勉強時間は、解答の間隔から推定した目安です（5分以上あいたら休憩とみなします）。到達度は、全{total}
        問のうち直近の解答が正解の問題の割合です。
      </p>
    </div>
  )
}
