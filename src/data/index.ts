import type { CategoryId, Question } from './types'
import { arch } from './questions/arch'
import { dl } from './questions/dl'
import { genai } from './questions/genai'
import { history } from './questions/history'
import { law } from './questions/law'
import { ml } from './questions/ml'
import { trend } from './questions/trend'

export const ALL_QUESTIONS: Question[] = [
  ...history,
  ...trend,
  ...ml,
  ...dl,
  ...arch,
  ...genai,
  ...law,
]

export function questionsOf(category: CategoryId): Question[] {
  return ALL_QUESTIONS.filter((q) => q.category === category)
}

export { CATEGORIES } from './types'
export type { Category, CategoryId, Choice, Question } from './types'
