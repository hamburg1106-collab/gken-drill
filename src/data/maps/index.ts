import type { TermMap } from '../mapTypes'
import { appliedMaps } from './applied'
import { basicMaps } from './basics'
import { deepMaps } from './deep'

export const TERM_MAPS: TermMap[] = [...basicMaps, ...deepMaps, ...appliedMaps]
