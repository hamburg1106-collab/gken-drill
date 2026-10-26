import type { Question } from '../data/types'
import type { EdgeType, MapEdge, MapNode, TermMap } from '../data/mapTypes'

// 用語マップの線から「関係性クイズ」を作る。値の import を持たない純粋な関数にして、
// Node から直接読み込んで検証できるようにしている（scratchpad の検証スクリプト用）。
//
// 1本の線から2問作る。
//   p: 「A と B の関係として正しいものはどれか」（関係の種類と向きを問う）
//   n: 「A を改良して生まれたものはどれか」など（同じ図の用語から相手を選ぶ）

export const RELATION_PREFIX = 'r:'

const TYPE_LABEL: Record<EdgeType, string> = {
  evolve: '発展・改良',
  include: '含む',
  contrast: '対比・混同注意',
  solve: '対策',
  cause: '原因',
}

const nameOf = (n: MapNode) => n.label.replace(/\n/g, '')

/** 「何を予測？」のような問いかけの見出しは、問題文に入れると不自然なので出題に使わない */
const askable = (n: MapNode) => !/[？?]/.test(n.label)

/** 2つの用語の関係を表す文。dir は from → to の向きで読むか */
type Rel = { type: EdgeType; forward: boolean }

function relText(rel: Rel, A: string, B: string): string {
  // forward なら A=from, B=to。逆向きは入れ替えて同じ文型を使う
  const [x, y] = rel.forward ? [A, B] : [B, A]
  switch (rel.type) {
    case 'evolve':
      return `「${x}」を発展・改良したものが「${y}」である`
    case 'include':
      return `「${y}」は「${x}」に含まれる（${x}の一種・構成要素）`
    case 'contrast':
      return `「${x}」と「${y}」は対比される、取り違えやすい別物である`
    case 'solve':
      return `「${y}」は、「${x}」という課題への対策である`
    case 'cause':
      return `「${x}」が原因となって、「${y}」という課題が起こる`
  }
}

const ALL_RELS: Rel[] = [
  { type: 'evolve', forward: true },
  { type: 'evolve', forward: false },
  { type: 'include', forward: true },
  { type: 'include', forward: false },
  { type: 'contrast', forward: true },
  { type: 'solve', forward: true },
  { type: 'solve', forward: false },
  { type: 'cause', forward: true },
  { type: 'cause', forward: false },
]

/** 正解の選択肢の解説。2つの用語の説明と、図の線に付いた一言 */
function explain(a: MapNode, b: MapNode, e: MapEdge): string {
  const line = `図の線は「${TYPE_LABEL[e.type]}」${e.label ? `（${e.label}）` : ''}。`
  return `${line}${nameOf(a)}：${a.def} ${nameOf(b)}：${b.def}`
}

/** 簡単な疑似乱数。出題のたびに選択肢が変わらないよう、線ごとに決まった並びで選ぶ */
function seeded(seed: string): () => number {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function pick<T>(items: T[], n: number, rand: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a.slice(0, n)
}

/** starts から types の線を向きどおりにたどって行ける用語（starts 自身は含まない） */
function descendants(map: TermMap, starts: string[], types: EdgeType[]): Set<string> {
  return walk(map, starts, types, (x) => [x.from, x.to])
}

/** starts から types の線を逆向きにたどって行ける用語 */
function ancestors(map: TermMap, starts: string[], type: EdgeType): Set<string> {
  return walk(map, starts, [type], (x) => [x.to, x.from])
}

function walk(map: TermMap, starts: string[], types: EdgeType[], dir: (x: MapEdge) => [string, string]): Set<string> {
  const seen = new Set<string>()
  const queue = [...starts]
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const x of map.edges) {
      const [src, dst] = dir(x)
      if (types.includes(x.type) && src === id && !seen.has(dst)) {
        seen.add(dst)
        queue.push(dst)
      }
    }
  }
  return seen
}

function pairQuestion(map: TermMap, e: MapEdge, i: number, nodes: Map<string, MapNode>): Question | null {
  const a = nodes.get(e.from)
  const b = nodes.get(e.to)
  if (!a || !b || !askable(a) || !askable(b)) return null
  const A = nameOf(a)
  const B = nameOf(b)
  const rand = seeded(`${map.id}:${i}:p`)

  // この2語の間で実際に成り立つ関係（両方向の線をすべて見る）。不正解の選択肢から外す
  const same = (x: MapEdge) => x.from === e.from && x.to === e.to
  const flipped = (x: MapEdge) => x.from === e.to && x.to === e.from
  const holds = (r: Rel) =>
    map.edges.some((x) => {
      if (x.type !== r.type) return false
      if (r.type === 'contrast') return same(x) || flipped(x)
      return r.forward ? same(x) : flipped(x)
    })

  const correct: Rel = { type: e.type, forward: true }
  const wrong = ALL_RELS.filter((r) => !(r.type === correct.type && r.forward) && !holds(r))
  const problemInPair = a.kind === 'problem' || b.kind === 'problem'
  // 課題でない2語に「対策」「原因」を並べても不自然なので、課題が絡むときだけ候補にする
  const plausible = wrong.filter((r) => problemInPair || (r.type !== 'solve' && r.type !== 'cause'))
  // 向きのある関係なら、逆向きを必ず1つ入れて向きの理解を問う
  const reverse = plausible.find((r) => r.type === correct.type && !r.forward)
  const rest = plausible.filter((r) => r !== reverse)
  const chosen = [...(reverse ? [reverse] : []), ...pick(rest, reverse ? 2 : 3, rand)]
  if (chosen.length < 3) return null

  const choices = [
    { text: relText(correct, A, B), note: explain(a, b, e) },
    ...chosen.map((r) => ({
      text: relText(r, A, B),
      note: r.type === correct.type ? '向きが逆である。' : `図では「${TYPE_LABEL[r.type]}」の関係ではない。`,
    })),
  ]
  return {
    id: `${RELATION_PREFIX}${map.id}:${i}:p`,
    category: map.category,
    text: `「${A}」と「${B}」の関係として正しいものはどれか。`,
    choices,
    answer: 0,
  }
}

function nodeQuestion(map: TermMap, e: MapEdge, i: number, nodes: Map<string, MapNode>): Question | null {
  const a = nodes.get(e.from)
  const b = nodes.get(e.to)
  if (!a || !b || !askable(a) || !askable(b)) return null
  const rand = seeded(`${map.id}:${i}:n`)

  // 何を聞くか：起点の用語（ask）と、答えになる用語（ans）
  let ask: MapNode
  let ans: MapNode
  let text: string
  let valid: (x: MapEdge) => string | null
  switch (e.type) {
    case 'evolve':
      ask = a
      ans = b
      text = `「${nameOf(a)}」を発展・改良して生まれたものはどれか。`
      valid = (x) => (x.type === 'evolve' && x.from === a.id ? x.to : null)
      break
    case 'include':
      ask = a
      ans = b
      text = `「${nameOf(a)}」に含まれるもの（${nameOf(a)}の一種・構成要素）はどれか。`
      valid = (x) => (x.type === 'include' && x.from === a.id ? x.to : null)
      break
    case 'contrast':
      ask = a
      ans = b
      text = `「${nameOf(a)}」と対比される、取り違えやすいものはどれか。`
      valid = (x) =>
        x.type === 'contrast' && (x.from === a.id || x.to === a.id) ? (x.from === a.id ? x.to : x.from) : null
      break
    case 'solve':
      ask = a
      ans = b
      text = `「${nameOf(a)}」への対策として位置づけられるものはどれか。`
      valid = (x) => (x.type === 'solve' && x.from === a.id ? x.to : null)
      break
    case 'cause':
      ask = b
      ans = a
      text = `「${nameOf(b)}」の原因として位置づけられるものはどれか。`
      valid = (x) => (x.type === 'cause' && x.to === b.id ? x.from : null)
      break
  }

  // 直接の答えに加え、線を先までたどって同じことが言えてしまう用語も答えとみなし、選択肢から外す。
  // 例：SGD → AdaGrad → RMSProp → Adam なら、RMSProp も Adam も「SGDを改良したもの」と言える。
  // 対策なら、対策の発展形（LSTM → … → Attention）も同じ課題への対策と読めてしまう
  // 含まれるもの（L1正則化は正則化の一種なので、それも過学習への対策と言える）や、
  // 問いの用語そのものから発展・包含をたどった先（分散表現 → word2vec → … → BERT）も同じ。
  const direct = map.edges.map(valid).filter((x): x is string => x !== null)
  const answers = new Set(direct)
  const grow = (ids: Iterable<string>) => {
    for (const id of descendants(map, [...ids], ['evolve', 'include'])) answers.add(id)
  }
  if (e.type === 'evolve' || e.type === 'include' || e.type === 'solve') {
    grow(direct)
    grow([ask.id])
  }
  if (e.type === 'solve') {
    // 対策のもとになった用語（F値に対する適合率・再現率）も、同じ課題に使えると読めてしまう
    for (const id of ancestors(map, direct, 'evolve')) answers.add(id)
    // 対比の相手（PCA に対する t-SNE）は似た働きを持つことが多く、同じく対策と読めてしまう
    for (const x of map.edges) {
      if (x.type !== 'contrast') continue
      if (direct.includes(x.from)) answers.add(x.to)
      if (direct.includes(x.to)) answers.add(x.from)
    }
  }
  // 「対策はどれか」では、改良や対策の行き先になっている手法（後から出てきた技術）は、
  // 図に線がなくても同じ課題を和らげると読めることがある（例：勾配消失に対する Attention）。
  // そうした用語は使わず、土台の用語や課題からだけ選ぶ
  const later =
    e.type === 'solve'
      ? descendants(
          map,
          map.edges.filter((x) => x.type === 'evolve' || x.type === 'solve').map((x) => x.to),
          ['evolve', 'solve', 'include'],
        )
      : new Set<string>()
  if (e.type === 'solve') {
    for (const x of map.edges) if (x.type === 'evolve' || x.type === 'solve') later.add(x.to)
  }
  const candidates = map.nodes.filter(
    (n) => n.id !== ask.id && !answers.has(n.id) && n.kind !== 'group' && !later.has(n.id),
  )
  if (candidates.length < 3) return null
  const distractors = pick(candidates, 3, rand)

  return {
    id: `${RELATION_PREFIX}${map.id}:${i}:n`,
    category: map.category,
    text,
    choices: [
      { text: nameOf(ans), note: explain(a, b, e) },
      ...distractors.map((n) => ({ text: nameOf(n), note: n.def })),
    ],
    answer: 0,
  }
}

/** 全マップの関係性クイズ。mapId を渡すとその図だけ */
export function buildRelationQuestions(maps: TermMap[], mapId?: string): Question[] {
  return maps
    .filter((m) => !mapId || m.id === mapId)
    .flatMap((m) => {
      const nodes = new Map(m.nodes.map((n) => [n.id, n]))
      return m.edges.flatMap((e, i) =>
        [pairQuestion(m, e, i, nodes), nodeQuestion(m, e, i, nodes)].filter((q): q is Question => q !== null),
      )
    })
}

export function isRelationId(id: string): boolean {
  return id.startsWith(RELATION_PREFIX)
}
