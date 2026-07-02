import type { Question } from '../context/GameContext'

const ANSWER_COLORS: Record<string, string> = {
  '是': 'text-green-600',
  '不是': 'text-red-500',
  '不确定': 'text-gray-400',
  '无关': 'text-orange-500',
  '猜对了': 'text-yellow-500 font-bold',
}

export default function QuestionItem({ question, index }: { question: Question; index: number }) {
  const answerColor = ANSWER_COLORS[question.aiAnswer] ?? 'text-gray-400'

  return (
    <div className="relative pl-10 pb-6 last:pb-0">
      {/* Timeline node */}
      <div className="absolute left-0 top-1 w-7 h-7 rounded-full
        bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center
        text-xs font-bold text-yellow-700 z-10">
        {index}
      </div>

      {/* Timeline line */}
      <div className="absolute left-[13px] top-8 bottom-0 w-0.5 bg-yellow-100" />

      {/* Content card */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
        {/* Question */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-gray-800 text-sm flex-1">{question.content}</p>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm">{question.playerEmoji}</span>
            <span className="text-xs text-gray-400">{question.playerNickname}</span>
          </div>
        </div>

        {/* AI Answer */}
        <div className="mt-2 pt-2 border-t border-gray-50">
          <span className={`text-sm ${answerColor}`}>
            AI 判定：{question.aiAnswer}
          </span>
        </div>
      </div>
    </div>
  )
}
