import type { ComponentType } from 'react'
import type { CategoryId } from '../data'
import { Activation } from './Activation'
import { Attention } from './Attention'
import { Convolution } from './Convolution'
import { GradientDescent } from './GradientDescent'
import { Overfitting } from './Overfitting'
import { Pooling } from './Pooling'
import { SoftmaxSigmoid } from './SoftmaxSigmoid'
import { Threshold } from './Threshold'

export type Figure = {
  id: string
  title: string
  summary: string
  category: CategoryId
  /** この図で仕組みを確かめられる問題。解説欄に「動く図解で見る」を出す */
  questionIds: string[]
  Component: ComponentType
}

export const FIGURES: Figure[] = [
  {
    id: 'overfit',
    title: '過学習',
    summary: 'モデルを複雑にすると、練習用には合うのに本番で外れる',
    category: 'ml',
    questionIds: ['m12', 'm38', 'd15', 'd36', 'd38'],
    Component: Overfitting,
  },
  {
    id: 'threshold',
    title: '閾値と適合率・再現率',
    summary: '判定ラインを動かすと、見逃しと誤判定が入れ替わる',
    category: 'ml',
    questionIds: ['m15', 'm16', 'm17', 'm21', 'm22', 'm23'],
    Component: Threshold,
  },
  {
    id: 'gd',
    title: '勾配降下法と学習率',
    summary: '学習率（歩幅）を変えて、谷底へのたどり着き方を比べる',
    category: 'dl',
    questionIds: ['d09', 'd10', 'd11', 'd12', 'd27'],
    Component: GradientDescent,
  },
  {
    id: 'activation',
    title: '活性化関数と勾配消失',
    summary: '関数ごとの形と傾き、層を重ねたときに残る勾配',
    category: 'dl',
    questionIds: ['d02', 'd04', 'd05', 'd20', 'd21', 'd23', 'd25', 'd39', 'd44'],
    Component: Activation,
  },
  {
    id: 'softmax',
    title: 'ソフトマックスとシグモイド',
    summary: '「どれか1つ」と「それぞれ はい・いいえ」の違い',
    category: 'dl',
    questionIds: ['d06', 'd40', 'd41', 'd42', 'm03', 'm39', 'm44'],
    Component: SoftmaxSigmoid,
  },
  {
    id: 'conv',
    title: '畳み込み',
    summary: 'フィルタを滑らせる様子と、パディング・ストライドで変わる出力の大きさ',
    category: 'arch',
    questionIds: ['a01', 'a03', 'a04', 'a18', 'a19', 'a20'],
    Component: Convolution,
  },
  {
    id: 'pooling',
    title: 'プーリング',
    summary: '最大と平均のまとめ方と、位置のずれに強い理由',
    category: 'arch',
    questionIds: ['a02', 'a22', 'a23'],
    Component: Pooling,
  },
  {
    id: 'attention',
    title: 'Attention（注意機構）',
    summary: '単語どうしが、どこに注目して意味を決めているか',
    category: 'arch',
    questionIds: ['a12', 'a13', 'a14', 'a15', 'a31', 'a32'],
    Component: Attention,
  },
]

export function figureOf(id: string): Figure | undefined {
  return FIGURES.find((f) => f.id === id)
}

/** 問題に対応する図解（1問につき最大1つ） */
export function figureForQuestion(questionId: string): Figure | undefined {
  return FIGURES.find((f) => f.questionIds.includes(questionId))
}
