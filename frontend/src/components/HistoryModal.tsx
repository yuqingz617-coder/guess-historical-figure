import { useState, useEffect } from 'react'
import Modal from './Modal'
import { getQuestions, type QuestionResponse } from '../lib/api'
import QuestionItem from './QuestionItem'
import type { Question } from '../context/GameContext'

interface HistoryModalProps {
  open: boolean
  gameId: string
  figureName: string
  onClose: () => void
}

export default function HistoryModal({ open, gameId, figureName, onClose }: HistoryModalProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !gameId) return
    setLoading(true)
    getQuestions(gameId)
      .then(({ questions: qs }) => {
        setQuestions(
          qs.map((q: QuestionResponse) => ({
            id: q.id,
            gameId: q.gameId,
            playerId: q.playerId,
            playerEmoji: q.playerEmoji,
            playerNickname: q.playerNickname,
            content: q.content,
            aiAnswer: q.aiAnswer,
            sequence: q.sequence,
            createdAt: q.createdAt,
          }))
        )
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open, gameId])

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-800 mb-4">{figureName}</h2>

      {loading ? (
        <p className="text-gray-400 text-center py-8">加载中...</p>
      ) : questions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">该局游戏无问答记录</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {questions.map((q, i) => (
            <QuestionItem key={q.id} question={q} index={i + 1} />
          ))}
        </div>
      )}

      <div className="mt-6">
        <button onClick={onClose} className="btn-secondary w-full">
          关闭
        </button>
      </div>
    </Modal>
  )
}
