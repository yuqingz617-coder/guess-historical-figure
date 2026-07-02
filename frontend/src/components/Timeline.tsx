import { useEffect, useRef } from 'react'
import { useGame } from '../context/GameContext'
import QuestionItem from './QuestionItem'

export default function Timeline() {
  const { questions } = useGame()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [questions.length])

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="text-center">
          <span className="text-5xl">💡</span>
          <p className="text-gray-400 text-sm mt-3">
            开始提问吧！
          </p>
          <p className="text-gray-300 text-xs mt-1">
            例如：这个人是唐朝的吗？
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {questions.map((q, i) => (
        <QuestionItem key={q.id} question={q} index={i + 1} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
