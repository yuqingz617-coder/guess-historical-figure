import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import Timeline from '../components/Timeline'
import InputArea from '../components/InputArea'
import CorrectModal from '../components/CorrectModal'
import { getActiveGame, getQuestions, type QuestionResponse } from '../lib/api'

export default function GamePage() {
  const navigate = useNavigate()
  const { player, setCurrentGame, setQuestions } = useGame()
  const [correctModal, setCorrectModal] = useState<{
    winnerNickname: string; winnerEmoji: string; figureName: string; isSelf: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!player) {
      navigate('/')
      return
    }

    const init = async () => {
      try {
        const { game } = await getActiveGame()
        if (game) {
          setCurrentGame({
            id: game.id,
            status: game.status,
            startedAt: game.started_at,
            figureName: game.figure_name,
          })
          const { questions: qs } = await getQuestions(game.id)
          setQuestions(qs.map((q: QuestionResponse) => ({
            id: q.id,
            gameId: q.gameId,
            playerId: q.playerId,
            playerEmoji: q.playerEmoji,
            playerNickname: q.playerNickname,
            content: q.content,
            aiAnswer: q.aiAnswer,
            sequence: q.sequence,
            createdAt: q.createdAt,
          })))
        }
      } catch (e) {
        console.error('Game page init failed:', e)
      }
      setLoading(false)
    }

    init()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <span className="text-4xl animate-bounce">💬</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-primary-50">
      <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            hover:bg-gray-100 text-gray-500 transition-colors"
        >
          ←
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">问答页</h1>
      </div>
      <Timeline />
      <InputArea />
      {correctModal && (
        <CorrectModal open={!!correctModal} onClose={() => setCorrectModal(null)} {...correctModal} />
      )}
    </div>
  )
}
