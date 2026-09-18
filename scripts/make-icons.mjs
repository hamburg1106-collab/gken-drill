// アプリアイコンを生成する。`npm run icons` で public/ に書き出す。
// モチーフは4択のリスト。上から3番目だけが選ばれている状態を表す。
// 文字を使わないのは、環境によってフォントが無くレンダリングが崩れるのを避けるため。
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const BG = '#0f1720'
const FG = '#3d4d5e'
const ACCENT = '#4aa3c7'
const MARK = '#0f1720'

/** 選択肢1行分。選択中の行だけアクセント色で塗り、チェックを載せる */
const rowSvg = (y, selected) => {
  const x = 96
  const w = 320
  const h = 62
  const r = 18
  const cx = x + 42
  const cy = y + h / 2
  const dot = selected
    ? `<circle cx="${cx}" cy="${cy}" r="17" fill="${MARK}" opacity="0.9"/>
       <path d="M ${cx - 8} ${cy} l 6 7 l 11 -13" fill="none" stroke="${ACCENT}"
             stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<circle cx="${cx}" cy="${cy}" r="17" fill="none" stroke="#56687b" stroke-width="4"/>`
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"
          fill="${selected ? ACCENT : FG}" opacity="${selected ? 1 : 0.55}"/>
    ${dot}
    <rect x="${cx + 34}" y="${cy - 7}" width="${selected ? 176 : 150}" height="14" rx="7"
          fill="${selected ? MARK : '#8a9cae'}" opacity="${selected ? 0.75 : 0.65}"/>
  `
}

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="${BG}"/>
  ${rowSvg(104, false)}
  ${rowSvg(180, false)}
  ${rowSvg(256, true)}
  ${rowSvg(332, false)}
</svg>
`.trim()

await writeFile(resolve(publicDir, 'favicon.svg'), `${iconSvg}\n`, 'utf8')

const buffer = Buffer.from(iconSvg)
for (const [name, size] of [
  ['icon-512.png', 512],
  ['icon-192.png', 192],
  ['apple-touch-icon.png', 180],
]) {
  await sharp(buffer).resize(size, size).png().toFile(resolve(publicDir, name))
  console.log(`${name} (${size}px)`)
}
console.log('favicon.svg')
