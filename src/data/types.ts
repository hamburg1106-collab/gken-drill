export type CategoryId =
  | 'history'
  | 'trend'
  | 'ml'
  | 'dl'
  | 'arch'
  | 'genai'
  | 'law'

export type Category = {
  id: CategoryId
  label: string
}

export type Choice = {
  /** 選択肢の文言 */
  text: string
  /** 正解ならなぜ正しいか、不正解ならその用語が何なのかを1〜3行で */
  note: string
}

export type Question = {
  id: string
  category: CategoryId
  text: string
  /** 4つ。画面ではシャッフルして出すので、この並び順に意味はない */
  choices: Choice[]
  /** choices 内の正解の添字 */
  answer: number
  /** 年号・数値・固有名詞など、公式テキストとの照合を推奨する問題に立てる */
  needsCheck?: boolean
}

export const CATEGORIES: Category[] = [
  { id: 'history', label: 'AIの定義と歴史' },
  { id: 'trend', label: 'AIをめぐる動向と問題' },
  { id: 'ml', label: '機械学習の具体的手法' },
  { id: 'dl', label: 'ディープラーニングの概要と手法' },
  { id: 'arch', label: 'CNN・RNN・Transformer' },
  { id: 'genai', label: '生成AIと大規模言語モデル' },
  { id: 'law', label: '法規・倫理・社会実装' },
]
